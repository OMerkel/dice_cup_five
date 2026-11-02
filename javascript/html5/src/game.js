export const CATEGORIES = [
  { id: 'ones', label: 'Ones', section: 'upper', face: 1 },
  { id: 'twos', label: 'Twos', section: 'upper', face: 2 },
  { id: 'threes', label: 'Threes', section: 'upper', face: 3 },
  { id: 'fours', label: 'Fours', section: 'upper', face: 4 },
  { id: 'fives', label: 'Fives', section: 'upper', face: 5 },
  { id: 'sixes', label: 'Sixes', section: 'upper', face: 6 },
  { id: 'three-kind', label: 'Three of a Kind', section: 'lower' },
  { id: 'four-kind', label: 'Four of a Kind', section: 'lower' },
  { id: 'full-house', label: 'Full House', section: 'lower' },
  { id: 'small-straight', label: 'Small Straight', section: 'lower' },
  { id: 'large-straight', label: 'Large Straight', section: 'lower' },
  { id: 'five-kind', label: 'Five of a Kind', section: 'lower' },
  { id: 'chance', label: 'Chance', section: 'lower' },
];

const UPPER_BONUS_THRESHOLD = 63;
const UPPER_BONUS_POINTS = 35;
const FIVE_KIND_BONUS_POINTS = 100;
const MAX_ROLLS = 3;
const DIE_COUNT = 5;

export function createGame() {
  return {
    scores: Object.fromEntries(CATEGORIES.map(({ id }) => [id, null])),
    dice: [1, 2, 3, 4, 5],
    held: Array(DIE_COUNT).fill(false),
    rolls: 0,
    turn: 0,
    bonus: 0,
    finished: false,
  };
}

export function rollTurn(state, random = Math.random) {
  if (state.finished || state.rolls >= MAX_ROLLS) return state;
  if (typeof random !== 'function') throw new TypeError('Random source must be a function.');

  const dice = state.dice.map((value, index) => {
    if (state.rolls > 0 && state.held[index]) return value;
    const sample = random();
    if (sample < 0 || sample >= 1)
      throw new RangeError('Random values must be from 0 to less than 1.');
    return Math.floor(sample * 6) + 1;
  });

  return { ...state, dice, rolls: state.rolls + 1 };
}

export function toggleHeld(state, index) {
  if (state.rolls === 0 || state.rolls >= MAX_ROLLS || state.finished) return state;
  if (!Number.isInteger(index) || index < 0 || index >= DIE_COUNT) {
    throw new RangeError('Die index is out of range.');
  }
  const held = [...state.held];
  held[index] = !held[index];
  return { ...state, held };
}

export function scoreCategory(categoryId, dice) {
  validateDice(dice);
  const category = CATEGORIES.find(({ id }) => id === categoryId);
  if (!category) throw new RangeError(`Unknown scoring category: ${categoryId}`);

  if (category.section === 'upper') {
    return dice.filter((value) => value === category.face).length * category.face;
  }

  const counts = Array(7).fill(0);
  for (const value of dice) counts[value] += 1;
  const groups = counts.filter((count) => count > 0).sort((left, right) => right - left);
  const sum = dice.reduce((total, value) => total + value, 0);

  switch (categoryId) {
    case 'three-kind':
      return groups[0] >= 3 ? sum : 0;
    case 'four-kind':
      return groups[0] >= 4 ? sum : 0;
    case 'full-house':
      return groups[0] === 3 && groups[1] === 2 ? 25 : 0;
    case 'small-straight':
      return hasStraight(dice, 4) ? 30 : 0;
    case 'large-straight':
      return hasStraight(dice, 5) ? 40 : 0;
    case 'five-kind':
      return groups[0] === 5 ? 50 : 0;
    case 'chance':
      return sum;
    default:
      return 0;
  }
}

export function submitScore(state, categoryId) {
  if (state.finished) throw new Error('The game is already finished.');
  if (state.rolls === 0) throw new Error('Roll the dice before scoring.');
  if (!CATEGORIES.some(({ id }) => id === categoryId)) {
    throw new RangeError(`Unknown scoring category: ${categoryId}`);
  }
  if (state.scores[categoryId] !== null) throw new Error('That category has already been used.');

  const points = scoreCategory(categoryId, state.dice);
  const earnedFiveKindBonus = state.scores['five-kind'] === 50 && new Set(state.dice).size === 1;
  const scores = { ...state.scores, [categoryId]: points };
  const turn = state.turn + 1;

  return {
    ...state,
    scores,
    held: Array(DIE_COUNT).fill(false),
    rolls: 0,
    turn,
    bonus: state.bonus + (earnedFiveKindBonus ? FIVE_KIND_BONUS_POINTS : 0),
    finished: turn === CATEGORIES.length,
  };
}

export function getTotals(state) {
  const upper = CATEGORIES.filter(({ section }) => section === 'upper').reduce(
    (total, { id }) => total + (state.scores[id] ?? 0),
    0,
  );
  const lower = CATEGORIES.filter(({ section }) => section === 'lower').reduce(
    (total, { id }) => total + (state.scores[id] ?? 0),
    0,
  );
  const upperBonus = upper >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS_POINTS : 0;

  return {
    upper,
    upperBonus,
    lower,
    repeatBonus: state.bonus,
    total: upper + upperBonus + lower + state.bonus,
  };
}

function hasStraight(dice, length) {
  const values = new Set(dice);
  for (let start = 1; start <= 7 - length; start += 1) {
    let matches = true;
    for (let offset = 0; offset < length; offset += 1) {
      if (!values.has(start + offset)) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

function validateDice(dice) {
  if (!Array.isArray(dice) || dice.length !== DIE_COUNT) {
    throw new TypeError('A roll must contain exactly five dice.');
  }
  if (dice.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) {
    throw new RangeError('Die values must be integers from 1 to 6.');
  }
}
