# PNG Sticker Streak Reward System — Design Spec
Date: 2026-03-15

## Overview

Add ~60 PNG stickers unlocked via consecutive-day streaks (every 5 days of completing at least one unit = 1 sticker pick). Enforce idempotency on quiz and speaking-practice star awards. Preserve all existing emoji stickers and star-based unlock mechanism.

---

## 1. Sticker Data Schema (`src/data/stickers.json`)

Add an optional `image` field and a required `unlockType` field to each sticker entry.

```json
{
  "id": "png-01",
  "name": "Kuromi",
  "image": "/stickers/kuromi-01.png",
  "unlockType": "streak",
  "category": "character",
  "description": "Day 5 streak reward!"
}
```

Existing emoji stickers gain `"unlockType": "stars"` and keep their `emoji` + `cost` fields.
PNG stickers have `"unlockType": "streak"`, no `cost`, no `emoji`.

---

## 2. Storage Schema — v2

### `ort-score` (new fields added)

```js
{
  _v: 2,
  totalScore,
  streak,                    // consecutive unit-completion days (int ≥ 0)
  lastActiveDate,            // ISO date of last unit completion (YYYY-MM-DD | null)
  unlockedStickers: [],      // star-purchased sticker ids
  streakMilestonesReached: 0,// count of 5-day milestones triggered so far
  pendingStickerPicks: 0,    // sticker selections not yet made by user
  pickedStickerIds: [],      // PNG sticker ids chosen via streak rewards
}
```

### `ort-progress` per bookId (new fields added)

```js
{
  // ...existing fields unchanged...
  quizAnswers:   {},  // { "q1": true, "q2": true } — questions answered correctly
  speechAnswers: {},  // { "hide": true }            — keywords passed in speaking
  unitStreakCounted: false,  // true once this unit has contributed to streak
}
```

### Migration v1 → v2

- `ort-score`: all new fields get safe defaults (0 / [] / false)
- `ort-progress` per item: `quizAnswers: {}`, `speechAnswers: {}`, `unitStreakCounted: false`
- `SCHEMA_VERSION` bumped to 2

---

## 3. Streak Logic (`src/services/scoringEngine.js`)

### New: `checkStreakBreak(streak, lastActiveDate)`

Called on app mount. Does NOT advance streak — only resets it if gap > 1 day.

```
today - lastActiveDate > 1 day  →  streak = 0
otherwise                        →  streak unchanged
```

### New: `advanceStreak(streak, lastActiveDate)`

Called when a unit is completed for the first time on a new calendar day.

```
lastActiveDate === today  →  streak unchanged (already counted today)
lastActiveDate === yesterday  →  streak + 1, lastActiveDate = today
else (gap > 1 or first time)  →  streak = 1, lastActiveDate = today
```

Returns `{ streak, lastActiveDate, milestoneTriggered: boolean }`.

`milestoneTriggered = Math.floor(newStreak / 5) > Math.floor(oldStreak / 5)`

---

## 4. ScoreContext (`src/contexts/ScoreContext.jsx`)

### Mount behavior (changed)

On mount: call `checkStreakBreak` instead of `updateStreak`. This means opening the app does NOT advance the streak — it only resets it if the child missed days.

Remove the `streakBonus` points awarded on mount (daily streak bonus removed — streak rewards are now sticker-based, not star-based).

### New action: `onUnitComplete(bookId)`

Called by the quiz result component when:
- `quizPassed` becomes true AND book status is `'completed'`
- AND `progress[bookId].unitStreakCounted === false`

Steps:
1. Load `progress[bookId].unitStreakCounted` — if already true, no-op
2. Call `advanceStreak(state.streak, state.lastActiveDate)`
3. If `milestoneTriggered`: increment `pendingStickerPicks`
4. Increment `streakMilestonesReached` if milestone triggered
5. Save updated `ort-score`
6. Call `updateItem(bookId, { unitStreakCounted: true })` via progress hook

The caller (quiz result component) is responsible for checking both conditions before calling `onUnitComplete`.

### New action: `pickSticker(stickerId)`

Adds stickerId to `pickedStickerIds`, decrements `pendingStickerPicks` by 1. No-op if already picked.

---

## 5. Quiz Idempotency (`src/hooks/useQuiz.js`)

### API change

`useQuiz(bookId, savedAnswers)` — accepts `savedAnswers: Record<string, boolean>` from `progress[bookId].quizAnswers`.

### Behaviour change in `answer(optionIndex)`

```js
const questionKey = `q${questionIndex + 1}`;
const alreadyEarned = savedAnswers[questionKey] === true;
const correct = optionIndex === currentQ.answer;

if (correct && !alreadyEarned) {
  setCorrectAnswers(prev => prev + 1);
  setNewlyCorrectKeys(prev => [...prev, questionKey]);
}
```

Returns `newlyCorrectKeys` as part of the hook's public API.

### Calling component responsibility

When quiz reaches `phase === 'complete'`:
1. `awardPoints(pointsEarned)` — only for `newlyCorrectKeys.length` correct answers
2. `updateItem(bookId, { quizAnswers: { ...savedAnswers, ...keysMap } })`
3. If `quizPassed && bookStatus === 'completed'`: call `onUnitComplete(bookId)`

---

## 6. Speech Idempotency (`src/components/speech/SpeechQuestion.jsx`)

When a keyword passes speech recognition:
1. Check `progress[bookId].speechAnswers[keyword]` — if already true, skip
2. Otherwise: `awardPoints(POINTS.SPEECH_PASS)` and `updateItem(bookId, { speechAnswers: { ...saved, [keyword]: true } })`

The `bookId` and `keyword` must be passed into `SpeechQuestion` (or accessed via context).

---

## 7. StickerPickerModal (new component)

File: `src/components/rewards/StickerPickerModal.jsx`

Triggers when `pendingStickerPicks > 0`.

```
┌─────────────────────────────────┐
│  🎉 You earned a sticker!       │
│  Pick one to add to your book!  │
│                                 │
│  [img] [img] [img] [img]        │
│  [img] [img] [img] [img]        │
│  [img] [img] [img] [img]        │
│                                 │
│  (scroll for more)              │
└─────────────────────────────────┘
```

- Full-screen overlay (z-50)
- Shows only PNG stickers NOT yet in `pickedStickerIds`
- On tap: calls `pickSticker(id)`, closes modal
- If `pendingStickerPicks > 1`, reopens immediately for next pick

Mount trigger: in `RewardsPage` and in quiz-result screen — wherever `pendingStickerPicks > 0`.

---

## 8. StickerShop updates (`src/components/rewards/StickerShop.jsx`)

Two sections:

**Section 1 — Earn with Stars ⭐** (existing emoji stickers, `unlockType === 'stars'`)
- Unchanged layout
- Shows cost, owned status, buy button

**Section 2 — Streak Stickers 🔥** (PNG stickers, `unlockType === 'streak'`)
- Shows image instead of emoji
- Shows "Unlocked ✓" or "🔒 Day X" (lock icon, next milestone)
- No buy button — unlocked via streak only
- Streak progress bar at top: `streak % 5` days toward next sticker

---

## 9. StickerGrid updates (`src/components/rewards/StickerGrid.jsx`)

```jsx
// Image vs emoji rendering
{sticker.image
  ? <img src={sticker.image} alt={sticker.name} className="w-12 h-12 object-contain" />
  : <div className="text-4xl">{sticker.emoji}</div>
}
```

---

## 10. RewardsPage updates (`src/components/rewards/RewardsPage.jsx`)

- Add streak progress display at top of page: `🔥 Day {streak} | Next sticker in {5 - (streak % 5)} days`
- Show `StickerPickerModal` when `pendingStickerPicks > 0`
- If `pendingStickerPicks > 0`: banner "🎁 You have {N} sticker(s) to claim!"

---

## 11. Image Asset Location

PNG files go in: `public/stickers/`
Referenced as: `/stickers/filename.png` (absolute path)

This directory is outside Vite's bundle pipeline — files are served as-is and never overwritten by `npm build`.

After `npm build` and deploy to NAS, also copy `public/stickers/` to `/web/oxford/stickers/` on the NAS (one-time setup; subsequent builds do NOT overwrite this folder since it's not generated by Vite).

---

## 12. Files Changed

| File | Change |
|------|--------|
| `src/data/stickers.json` | Add 60 PNG sticker entries; add `unlockType` to all entries |
| `src/services/storageService.js` | Schema v2; new fields; migrate v1→v2 |
| `src/services/scoringEngine.js` | Add `checkStreakBreak`, `advanceStreak`; remove old `updateStreak` export (keep for migration compat) |
| `src/contexts/ScoreContext.jsx` | Use `checkStreakBreak` on mount; add `onUnitComplete`, `pickSticker` actions |
| `src/hooks/useQuiz.js` | Accept `savedAnswers`; track `newlyCorrectKeys`; idempotent scoring |
| `src/hooks/useProgress.js` | Add `quizAnswers`, `speechAnswers`, `unitStreakCounted` to schema |
| `src/components/speech/SpeechQuestion.jsx` | Check `speechAnswers` before awarding points |
| `src/components/rewards/StickerShop.jsx` | Two sections; image rendering; streak progress |
| `src/components/rewards/StickerGrid.jsx` | Image vs emoji rendering |
| `src/components/rewards/RewardsPage.jsx` | Streak display; pending picks banner |
| `src/components/rewards/StickerPickerModal.jsx` | New component |
| `public/stickers/` | New directory (placeholder; user will copy PNGs here) |

---

## 13. Non-Goals

- No NAS file persistence (localStorage is sufficient; SW fix in separate task eliminates the root cause of data loss during updates)
- No cross-device sync
- No sticker trading or gifting
