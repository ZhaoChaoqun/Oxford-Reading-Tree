export function isBrokenEmoji(value) {
  if (typeof value !== 'string') {
    return true;
  }

  const trimmed = value.trim();
  return trimmed === '' || /^\?+$/.test(trimmed) || trimmed.includes('�');
}

export function getValidEmoji(value, fallback) {
  return isBrokenEmoji(value) ? fallback : value;
}

const STICKER_EMOJI_BY_NAME = {
  'Ice Cream': '🍦',
  Chocolate: '🍫',
  Popcorn: '🍿',
  Juice: '🧃',
  'Screen Time': '📺',
  Park: '🌳',
  'Small Toy': '🧸',
  Gift: '🎁',
  'Gold Star': '⭐',
  Rainbow: '🌈',
  'Floppy Dog': '🐶',
  Dinosaur: '🦖',
  Rocket: '🚀',
  'Magic Key': '🗝️',
  Butterfly: '🦋',
  Dragon: '🐉',
  Crown: '👑',
  'Shooting Star': '🌠',
  Castle: '🏰',
  'Treasure Chest': '🪙',
  Unicorn: '🦄',
  Superhero: '🦸',
};

export function getQuizEmoji(value) {
  return getValidEmoji(value, '❓');
}

export function getStickerEmoji(sticker) {
  const fallback = STICKER_EMOJI_BY_NAME[sticker?.name] ?? '⭐';
  return getValidEmoji(sticker?.emoji, fallback);
}

export function getStickerDescription(sticker) {
  const normalized = typeof sticker?.description === 'string'
    ? sticker.description.replace(/^\?+\s*/, '').trim()
    : '';

  if (normalized) {
    return normalized;
  }

  return sticker?.category ? `Category: ${sticker.category}` : '';
}
