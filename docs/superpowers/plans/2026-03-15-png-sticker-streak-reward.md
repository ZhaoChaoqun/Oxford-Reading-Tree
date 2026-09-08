# PNG Sticker Streak Reward System — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 60 PNG stickers unlocked by consecutive-day streaks (every 5 days completing at least one unit = 1 sticker pick), enforce quiz/speech star-award idempotency, and update the rewards UI to show streaks and image stickers.

**Architecture:** Storage schema bumped to v2 (new fields in `ort-score` and `ort-progress`). Streak advances only on unit completion (book + quiz both done, first time), not on app open. Quiz and speech awards are gated by per-question answer records. A `StickerPickerModal` appears when `pendingStickerPicks > 0`. PNG images live in `public/stickers/` (never overwritten by builds).

**Tech Stack:** React, localStorage (via existing `kv`/`storageService`), Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-15-png-sticker-streak-reward-design.md`

---

## Chunk 1: Storage schema v2

### Task 1: Upgrade `storageService.js` to schema v2

**Files:**
- Modify: `src/services/storageService.js`

- [ ] **Step 1: Bump `SCHEMA_VERSION` to 2**

Find:
```js
export const SCHEMA_VERSION = 1;
```
Replace with:
```js
export const SCHEMA_VERSION = 2;
```

- [ ] **Step 2: Add new `STORAGE_KEYS`**

No new top-level keys needed — new fields are added to existing keys.

- [ ] **Step 3: Update `migrateScore` to handle v1 → v2**

Find the `migrateScore` function and update it:

```js
export function migrateScore(saved, defaultState) {
  if (!saved || typeof saved !== 'object') return { ...defaultState };

  const from = saved._v ?? 0;

  // v0 → v1 fields
  const v1 = {
    totalScore:       typeof saved.totalScore === 'number'   ? saved.totalScore       : defaultState.totalScore,
    streak:           typeof saved.streak === 'number'       ? saved.streak           : defaultState.streak,
    lastActiveDate:   saved.lastActiveDate ?? defaultState.lastActiveDate,
    unlockedStickers: Array.isArray(saved.unlockedStickers)  ? saved.unlockedStickers : defaultState.unlockedStickers,
  };

  // v1 → v2: add streak milestone fields
  const v2 = {
    ...v1,
    streakMilestonesReached: typeof saved.streakMilestonesReached === 'number' ? saved.streakMilestonesReached : 0,
    pendingStickerPicks:     typeof saved.pendingStickerPicks === 'number'     ? saved.pendingStickerPicks     : 0,
    pickedStickerIds:        Array.isArray(saved.pickedStickerIds)             ? saved.pickedStickerIds        : [],
    _v: SCHEMA_VERSION,
  };

  if (from < 2) return v2;

  // Already v2+
  return { ...defaultState, ...saved, _v: SCHEMA_VERSION };
}
```

- [ ] **Step 4: Update `migrateProgress` to handle v1 → v2**

Find the `migrateProgress` function and update each item's defaults:

```js
export function migrateProgress(saved) {
  if (!saved || typeof saved !== 'object') return {};

  const migrated = {};
  for (const [id, item] of Object.entries(saved)) {
    if (id === '_v') continue;
    migrated[id] = {
      status:            item.status            ?? 'not-started',
      currentPage:       item.currentPage       ?? 0,
      quizPassed:        item.quizPassed        ?? false,
      speechPassed:      item.speechPassed      ?? false,
      videoDone:         item.videoDone         ?? false,
      scoreEarned:       item.scoreEarned       ?? 0,
      // v2 additions
      quizAnswers:       item.quizAnswers       && typeof item.quizAnswers === 'object'
                           ? item.quizAnswers : {},
      speechAnswers:     item.speechAnswers     && typeof item.speechAnswers === 'object'
                           ? item.speechAnswers : {},
      unitStreakCounted: item.unitStreakCounted  ?? false,
    };
  }
  return migrated;
}
```

- [ ] **Step 5: Update `DEFAULT_STATE` in `ScoreContext.jsx` to include new fields**

Open `src/contexts/ScoreContext.jsx` and update `DEFAULT_STATE`:

```js
const DEFAULT_STATE = {
  totalScore: 0,
  streak: 0,
  lastActiveDate: null,
  unlockedStickers: [],
  streakMilestonesReached: 0,
  pendingStickerPicks: 0,
  pickedStickerIds: [],
};
```

- [ ] **Step 6: Update `useProgress.js` default item shape**

In `src/hooks/useProgress.js`, find the two places where a default item object is defined (in `getItem` and `updateItem`) and add the new fields:

```js
const DEFAULT_ITEM = {
  status: 'not-started',
  currentPage: 0,
  quizPassed: false,
  speechPassed: false,
  videoDone: false,
  scoreEarned: 0,
  quizAnswers: {},
  speechAnswers: {},
  unitStreakCounted: false,
};
```

Replace inline object literals in `getItem` and `updateItem` with `{ ...DEFAULT_ITEM }`.

- [ ] **Step 7: Commit**

```bash
cd E:\OxfordTree\oxford-tree-pwa
git add src/services/storageService.js src/contexts/ScoreContext.jsx src/hooks/useProgress.js
git commit -m "feat(storage): schema v2 — add streak milestone fields and per-question idempotency fields"
```

---

## Chunk 2: Streak engine changes

### Task 2: Update `scoringEngine.js` — streak is unit-completion-based

**Files:**
- Modify: `src/services/scoringEngine.js`

- [ ] **Step 1: Add `checkStreakBreak` (mount-time check — resets if gap > 1 day, no advance)**

```js
/**
 * Called on app mount. Resets streak if the user missed days.
 * Does NOT advance streak — only unit completion does that.
 * @param {number} streak
 * @param {string|null} lastActiveDate  YYYY-MM-DD of last completed unit
 * @returns {{ streak: number, lastActiveDate: string|null }}
 */
export function checkStreakBreak(streak, lastActiveDate) {
  if (!lastActiveDate) return { streak: 0, lastActiveDate: null };
  const today = new Date().toISOString().slice(0, 10);
  if (lastActiveDate === today) return { streak, lastActiveDate };
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastActiveDate === yesterday) return { streak, lastActiveDate };
  // Gap > 1 day: streak is broken
  return { streak: 0, lastActiveDate };
}
```

- [ ] **Step 2: Add `advanceStreak` (called when a new unit is completed)**

```js
/**
 * Advances the streak when a unit is completed for the first time today.
 * @param {number} streak
 * @param {string|null} lastActiveDate
 * @returns {{ streak: number, lastActiveDate: string, milestoneTriggered: boolean }}
 */
export function advanceStreak(streak, lastActiveDate) {
  const today = new Date().toISOString().slice(0, 10);

  // Already counted a unit today — don't advance further
  if (lastActiveDate === today) {
    return { streak, lastActiveDate: today, milestoneTriggered: false };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let newStreak;
  if (lastActiveDate === yesterday) {
    newStreak = streak + 1;
  } else {
    // First ever unit, or gap > 1 day (broken streak, but user completed today)
    newStreak = 1;
  }

  const oldMilestone = Math.floor(streak / 5);
  const newMilestone = Math.floor(newStreak / 5);
  const milestoneTriggered = newMilestone > oldMilestone;

  return { streak: newStreak, lastActiveDate: today, milestoneTriggered };
}
```

- [ ] **Step 3: Keep old `updateStreak` exported for any existing callers (mark deprecated)**

Add a deprecation comment but do NOT remove it yet (backward compat):

```js
/**
 * @deprecated Use checkStreakBreak (on mount) and advanceStreak (on unit complete) instead.
 */
export function updateStreak(currentStreak, lastDate) {
  // ... original code unchanged ...
}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/scoringEngine.js
git commit -m "feat(scoring): add checkStreakBreak and advanceStreak — streak now unit-completion-based"
```

---

## Chunk 3: ScoreContext new actions

### Task 3: Update `ScoreContext.jsx` — mount + new actions

**Files:**
- Modify: `src/contexts/ScoreContext.jsx`

- [ ] **Step 1: Update import to use `checkStreakBreak` instead of `updateStreak`**

```js
import { checkStreakBreak, POINTS } from '../services/scoringEngine';
```

- [ ] **Step 2: Update `useEffect` on mount — use `checkStreakBreak`, remove daily streak bonus**

Replace the body of the mount `useEffect`:

```js
useEffect(() => {
  initStorage().then(() => {
    const pm = getIsPrivateMode;
    setPrivateMode(pm);

    const saved = migrateScore(kv.get(STORAGE_KEYS.SCORE), DEFAULT_STATE);

    // On mount: only check if streak is broken (does NOT advance streak)
    const { streak, lastActiveDate } = checkStreakBreak(
      saved.streak,
      saved.lastActiveDate
    );

    const initial = {
      ...saved,
      streak,
      lastActiveDate,
      // Note: no streakBonus here — rewards are now sticker-based, not star-based
    };

    setState(initial);
    kv.set(STORAGE_KEYS.SCORE, initial);

    if (pm) {
      console.warn('[ScoreContext] Private mode: progress will not be saved.');
    }
  });
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Add `onUnitComplete` action**

```js
/**
 * Called when a unit (book + quiz) is completed for the first time.
 * Advances streak and checks for 5-day milestone sticker reward.
 * @param {string} bookId
 */
const onUnitComplete = useCallback((bookId) => {
  setState(prev => {
    const { streak: newStreak, lastActiveDate: newDate, milestoneTriggered } =
      advanceStreak(prev.streak, prev.lastActiveDate);

    const newMilestonesReached = milestoneTriggered
      ? prev.streakMilestonesReached + 1
      : prev.streakMilestonesReached;

    const newPendingPicks = milestoneTriggered
      ? prev.pendingStickerPicks + 1
      : prev.pendingStickerPicks;

    const next = {
      ...prev,
      streak: newStreak,
      lastActiveDate: newDate,
      streakMilestonesReached: newMilestonesReached,
      pendingStickerPicks: newPendingPicks,
    };
    kv.set(STORAGE_KEYS.SCORE, next);
    return next;
  });
}, []);
```

Also import `advanceStreak` in the import line at the top:
```js
import { checkStreakBreak, advanceStreak, POINTS } from '../services/scoringEngine';
```

- [ ] **Step 4: Add `pickSticker` action**

```js
/**
 * Records a PNG sticker selection from a streak milestone reward.
 * @param {string} stickerId
 */
const pickSticker = useCallback((stickerId) => {
  setState(prev => {
    if (prev.pickedStickerIds.includes(stickerId)) return prev;
    if (prev.pendingStickerPicks <= 0) return prev;
    const next = {
      ...prev,
      pickedStickerIds: [...prev.pickedStickerIds, stickerId],
      pendingStickerPicks: prev.pendingStickerPicks - 1,
    };
    kv.set(STORAGE_KEYS.SCORE, next);
    return next;
  });
}, []);
```

- [ ] **Step 5: Add new fields and actions to context value**

```js
const value = {
  totalScore:              state.totalScore,
  streak:                  state.streak,
  lastActiveDate:          state.lastActiveDate,
  unlockedStickers:        state.unlockedStickers,
  streakMilestonesReached: state.streakMilestonesReached,
  pendingStickerPicks:     state.pendingStickerPicks,
  pickedStickerIds:        state.pickedStickerIds,
  isPrivateMode:           privateMode,
  awardPoints,
  unlockSticker,
  onUnitComplete,
  pickSticker,
};
```

- [ ] **Step 6: Commit**

```bash
git add src/contexts/ScoreContext.jsx
git commit -m "feat(ScoreContext): unit-completion streak, onUnitComplete action, pickSticker action"
```

---

## Chunk 4: Quiz idempotency

### Task 4: Update `useQuiz.js` — per-question star idempotency

**Files:**
- Modify: `src/hooks/useQuiz.js`

- [ ] **Step 1: Update the hook signature to accept `savedAnswers`**

Change:
```js
export function useQuiz(bookId) {
```
To:
```js
/**
 * @param {string} bookId
 * @param {Record<string, boolean>} savedAnswers  — already-correct questions from progress
 */
export function useQuiz(bookId, savedAnswers = {}) {
```

- [ ] **Step 2: Add `newlyCorrectKeys` state**

```js
const [newlyCorrectKeys, setNewlyCorrectKeys] = useState([]);  // question keys earned THIS session
```

- [ ] **Step 3: Update `answer` to skip already-earned questions**

Replace the `answer` callback body:

```js
const answer = useCallback((optionIndex) => {
  if (phase !== 'question') return;
  const currentQ = questions[questionIndex];
  if (!currentQ) return;

  const correct = optionIndex === currentQ.answer;
  const questionKey = `q${questionIndex + 1}`;
  const alreadyEarned = savedAnswers[questionKey] === true;

  setSelectedAnswer(optionIndex);
  setIsCorrect(correct);

  if (correct && !alreadyEarned) {
    setCorrectAnswers(prev => prev + 1);
    setNewlyCorrectKeys(prev => [...prev, questionKey]);
  }

  setPhase('reviewing');
}, [phase, questions, questionIndex, savedAnswers]);
```

- [ ] **Step 4: Reset `newlyCorrectKeys` in `start` and `retry`**

In the `start` callback, add:
```js
setNewlyCorrectKeys([]);
```
In the `retry` callback, add:
```js
setNewlyCorrectKeys([]);
```

- [ ] **Step 5: Export `newlyCorrectKeys` from hook**

Add to the return object:
```js
newlyCorrectKeys,  // string[] — question keys newly answered correctly THIS session
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useQuiz.js
git commit -m "feat(useQuiz): per-question idempotency — stars only awarded for newly correct answers"
```

### Task 5: Wire quiz result to save `quizAnswers` and trigger streak

**Files:**
- Read and modify the quiz result component (find it first)

- [ ] **Step 1: Find the quiz result component**

```bash
powershell -Command "Get-ChildItem 'E:\OxfordTree\oxford-tree-pwa\src\components\quiz' -Recurse -Name"
```

Identify the component that:
- Receives `quiz.phase === 'complete'` state
- Calls `awardPoints`
- Calls `markQuizPassed`

- [ ] **Step 2: Update the result handler**

The quiz result handler (wherever `awardPoints` is called after quiz completes) should:

```js
// BEFORE committing result:
// 1. Save newly correct answers to progress
if (quiz.newlyCorrectKeys.length > 0) {
  const updatedAnswers = { ...progressItem.quizAnswers };
  quiz.newlyCorrectKeys.forEach(key => { updatedAnswers[key] = true; });
  updateItem(bookId, { quizAnswers: updatedAnswers });
}

// 2. Award only newly earned points
if (quiz.pointsEarned > 0) {
  awardPoints(quiz.pointsEarned, 'quiz');
}

// 3. Mark quiz passed (existing)
markQuizPassed(bookId);

// 4. If unit is now complete for first time, advance streak
const item = getItem(bookId);
const bookDone = item.status === 'completed';
const quizNowPassed = true;
const alreadyCounted = item.unitStreakCounted;

if (bookDone && quizNowPassed && !alreadyCounted) {
  onUnitComplete(bookId);
  updateItem(bookId, { unitStreakCounted: true });
}
```

Import `onUnitComplete` from `useScore()`.

- [ ] **Step 3: Commit**

```bash
git add src/components/quiz/
git commit -m "feat(quiz): save per-question answers, trigger streak on unit completion"
```

---

## Chunk 5: Speech idempotency

### Task 6: Update `SpeechQuestion.jsx` — per-keyword star idempotency

**Files:**
- Modify: `src/components/speech/SpeechQuestion.jsx`

- [ ] **Step 1: Find where `awardPoints(POINTS.SPEECH_PASS)` is called**

```bash
powershell -Command "Select-String -Path 'E:\OxfordTree\oxford-tree-pwa\src\components\speech\SpeechQuestion.jsx' -Pattern 'awardPoints'"
```

- [ ] **Step 2: Gate the speech award behind `speechAnswers` check**

Ensure `SpeechQuestion` receives `bookId`, `keyword`, and access to `progress` (via `useProgress` or props).

Before awarding points, check:

```js
const progressItem = getItem(bookId);
const alreadyPassed = progressItem.speechAnswers?.[keyword] === true;

if (!alreadyPassed) {
  awardPoints(POINTS.SPEECH_PASS, 'speech');
  const updatedSpeech = { ...progressItem.speechAnswers, [keyword]: true };
  updateItem(bookId, { speechAnswers: updatedSpeech });
}
```

- [ ] **Step 3: Verify `bookId` and `keyword` are available in `SpeechQuestion`**

If `bookId` or `keyword` are not currently props, trace how `SpeechQuestion` is used and add them as props. Look at `SpeechQuestion`'s usage site:

```bash
powershell -Command "Select-String -Path 'E:\OxfordTree\oxford-tree-pwa\src' -Pattern 'SpeechQuestion' -Recurse"
```

- [ ] **Step 4: Commit**

```bash
git add src/components/speech/SpeechQuestion.jsx
git commit -m "feat(speech): per-keyword idempotency — SPEECH_PASS stars awarded only once per keyword"
```

---

## Chunk 6: Sticker data

### Task 7: Add PNG sticker entries to `stickers.json` + create `public/stickers/`

**Files:**
- Modify: `src/data/stickers.json`
- Create directory: `public/stickers/`

- [ ] **Step 1: Add `unlockType` field to all existing emoji stickers**

Open `src/data/stickers.json`. For each of the 15 existing entries, add:
```json
"unlockType": "stars"
```

- [ ] **Step 2: Add 60 PNG sticker placeholder entries**

Append after the last emoji sticker, 60 entries following this pattern:

```json
{
  "id": "png-01",
  "name": "Sticker 1",
  "image": "/stickers/png-sticker-01.png",
  "unlockType": "streak",
  "category": "character",
  "description": "Day 5 reward!"
},
{
  "id": "png-02",
  "name": "Sticker 2",
  "image": "/stickers/png-sticker-02.png",
  "unlockType": "streak",
  "category": "character",
  "description": "Day 10 reward!"
},
...continue through png-60...
```

Use incrementing descriptions: "Day 5 reward!", "Day 10 reward!", ..., "Day 300 reward!" (every 5th milestone).

- [ ] **Step 3: Create the `public/stickers/` directory with a placeholder**

```bash
powershell -Command "New-Item -ItemType Directory -Force -Path 'E:\OxfordTree\oxford-tree-pwa\public\stickers'"
powershell -Command "Set-Content 'E:\OxfordTree\oxford-tree-pwa\public\stickers\.gitkeep' ''"
```

Add a `README.txt` in `public/stickers/`:
```
Place PNG sticker files here.
Naming convention: png-sticker-01.png through png-sticker-60.png
(or update stickers.json image paths to match your actual filenames)

This directory is NOT overwritten by npm build.
After deploy, copy this folder to /web/oxford/stickers/ on the NAS.
```

- [ ] **Step 4: Commit**

```bash
git add src/data/stickers.json public/stickers/
git commit -m "feat(stickers): add 60 PNG sticker placeholder entries and public/stickers/ directory"
```

---

## Chunk 7: Rewards UI

### Task 8: Update `StickerGrid.jsx` — image vs emoji rendering

**Files:**
- Modify: `src/components/rewards/StickerGrid.jsx`

- [ ] **Step 1: Replace emoji `<div>` with conditional image/emoji rendering**

```jsx
{sticker.image
  ? (
    <img
      src={sticker.image}
      alt={sticker.name}
      className="h-12 w-12 object-contain"
    />
  )
  : (
    <div className="text-4xl">{sticker.emoji}</div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rewards/StickerGrid.jsx
git commit -m "feat(StickerGrid): render PNG image when sticker.image is present"
```

### Task 9: Update `StickerShop.jsx` — two sections + streak progress

**Files:**
- Modify: `src/components/rewards/StickerShop.jsx`

- [ ] **Step 1: Split stickers into two arrays**

```js
const { totalScore, streak, unlockedStickers, pickedStickerIds, unlockSticker } = useScore();
const starStickers   = stickersData.stickers.filter(s => s.unlockType === 'stars');
const streakStickers = stickersData.stickers.filter(s => s.unlockType === 'streak');
```

- [ ] **Step 2: Add streak progress bar above streak stickers section**

```jsx
{/* Streak stickers header */}
<div className="mt-6 mb-3">
  <div className="flex items-center justify-between text-sm font-bold text-gray-700">
    <span>🔥 Streak Stickers</span>
    <span>{streak % 5}/5 days</span>
  </div>
  <div className="mt-1 h-2 rounded-full bg-gray-200">
    <div
      className="h-2 rounded-full bg-orange-400 transition-all"
      style={{ width: `${((streak % 5) / 5) * 100}%` }}
    />
  </div>
  <div className="mt-1 text-xs text-gray-400">
    {streak % 5 === 0 && streak > 0
      ? '🎉 Milestone reached!'
      : `${5 - (streak % 5)} day${5 - (streak % 5) !== 1 ? 's' : ''} until next sticker`}
  </div>
</div>
```

- [ ] **Step 3: Render streak stickers grid**

```jsx
<div className="grid grid-cols-3 gap-3">
  {streakStickers.map((sticker, i) => {
    const isPicked = pickedStickerIds.includes(sticker.id);
    const isReachable = i < (streakMilestonesReached * 1 + 1) * 1; // future stickers locked
    return (
      <div
        key={sticker.id}
        className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 ${
          isPicked ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-50'
        }`}
      >
        {sticker.image
          ? <img src={sticker.image} alt={sticker.name} className="h-14 w-14 object-contain" />
          : <div className="text-4xl">{sticker.emoji}</div>
        }
        <div className="text-center text-xs font-semibold text-gray-600">{sticker.name}</div>
        {isPicked
          ? <span className="text-xs font-bold text-green-600">✓ Collected</span>
          : <span className="text-xs text-gray-400">🔒</span>
        }
      </div>
    );
  })}
</div>
```

Also get `streakMilestonesReached` from `useScore()`.

- [ ] **Step 4: Commit**

```bash
git add src/components/rewards/StickerShop.jsx
git commit -m "feat(StickerShop): two sections — star stickers and streak stickers with progress bar"
```

### Task 10: Create `StickerPickerModal.jsx`

**Files:**
- Create: `src/components/rewards/StickerPickerModal.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useScore } from '../../contexts/ScoreContext';
import stickersData from '../../data/stickers.json';

export function StickerPickerModal() {
  const { pendingStickerPicks, pickedStickerIds, pickSticker } = useScore();

  if (pendingStickerPicks <= 0) return null;

  const available = stickersData.stickers.filter(
    s => s.unlockType === 'streak' && !pickedStickerIds.includes(s.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 text-center">
          <div className="text-4xl">🎉</div>
          <h2 className="mt-2 text-xl font-bold text-gray-800">You earned a sticker!</h2>
          <p className="mt-1 text-sm text-gray-500">
            {pendingStickerPicks > 1
              ? `Pick one! (${pendingStickerPicks} to claim)`
              : 'Tap a sticker to add it to your collection'}
          </p>
        </div>

        <div className="grid max-h-72 grid-cols-3 gap-3 overflow-y-auto">
          {available.map(sticker => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => pickSticker(sticker.id)}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 border-orange-200 bg-orange-50 p-3 active:scale-95 active:bg-orange-100"
            >
              {sticker.image
                ? <img src={sticker.image} alt={sticker.name} className="h-14 w-14 object-contain" />
                : <div className="text-4xl">{sticker.emoji}</div>
              }
              <span className="text-center text-xs font-semibold leading-tight text-gray-600">
                {sticker.name}
              </span>
            </button>
          ))}
        </div>

        {available.length === 0 && (
          <p className="mt-4 text-center text-sm text-gray-400">
            All stickers collected! 🌟
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/rewards/StickerPickerModal.jsx
git commit -m "feat: StickerPickerModal — full-screen sticker selection on streak milestone"
```

### Task 11: Update `RewardsPage.jsx` — streak display + modal trigger

**Files:**
- Modify: `src/components/rewards/RewardsPage.jsx`

- [ ] **Step 1: Import `StickerPickerModal` and `useScore`**

```js
import { StickerPickerModal } from './StickerPickerModal';
import { useScore } from '../../contexts/ScoreContext';
```

- [ ] **Step 2: Add streak display and pending picks banner**

```jsx
const { streak, pendingStickerPicks } = useScore();

// In JSX, above the tab bar:
{pendingStickerPicks > 0 && (
  <div className="mx-4 mb-2 rounded-2xl bg-orange-100 px-4 py-3 text-center text-sm font-bold text-orange-700">
    🎁 You have {pendingStickerPicks} sticker{pendingStickerPicks !== 1 ? 's' : ''} to claim!
  </div>
)}

<div className="mx-4 mb-3 flex items-center gap-2 text-sm text-gray-600">
  <span>🔥</span>
  <span className="font-bold">{streak} day streak</span>
  <span className="text-gray-400">·</span>
  <span className="text-gray-400">
    {streak % 5 === 0 && streak > 0
      ? 'Milestone!'
      : `${5 - (streak % 5)} more to next sticker`}
  </span>
</div>
```

- [ ] **Step 3: Render modal at the end of the page JSX**

```jsx
{/* Modal renders on top of everything when pendingStickerPicks > 0 */}
<StickerPickerModal />
```

- [ ] **Step 4: Final build check**

```bash
cd E:\OxfordTree\oxford-tree-pwa
npm run build 2>&1 | tail -20
```

Expected: exits 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/rewards/RewardsPage.jsx
git commit -m "feat(RewardsPage): streak display, pending sticker banner, StickerPickerModal integration"
```

---

## Post-Implementation Notes for User

After `npm build` and deploying `dist/` to the NAS:

1. **Create `stickers/` folder on NAS**: copy your PNG files to `/web/oxford/stickers/` on the NAS.

2. **File naming**: by default `stickers.json` expects files named `png-sticker-01.png` through `png-sticker-60.png`. If your files have different names, edit `stickers.json` to match your actual filenames, update the `name` fields too, then rebuild.

3. **The `public/stickers/` directory** in the project source also accepts the same PNGs — during development (`npm run dev`), they'll be served from there. For production they must be on the NAS at `/web/oxford/stickers/`.

---

## Final Verification Checklist

- [ ] `npm run build` exits 0 with no TypeScript/lint errors
- [ ] `ort-score` in localStorage has new fields after first app open: `streakMilestonesReached`, `pendingStickerPicks`, `pickedStickerIds`
- [ ] `ort-progress[bookId]` has new fields: `quizAnswers`, `speechAnswers`, `unitStreakCounted`
- [ ] Completing a quiz twice does NOT double-award stars for already-correct questions
- [ ] Speech passing a word twice does NOT double-award stars
- [ ] Completing a unit (book + quiz) on a new day increments streak by 1
- [ ] Opening the app WITHOUT completing a unit does NOT increment streak
- [ ] At streak = 5: `pendingStickerPicks` becomes 1 and `StickerPickerModal` appears
- [ ] Selecting a sticker adds it to `pickedStickerIds` and decrements `pendingStickerPicks`
- [ ] `StickerGrid` shows PNG images for picked streak stickers
- [ ] `StickerShop` shows two sections with streak progress bar
