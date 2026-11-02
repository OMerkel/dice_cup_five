import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  createGame,
  getTotals,
  rollTurn,
  scoreCategory,
  submitScore,
  toggleHeld,
} from '../src/game.js';

describe('game turns', () => {
  it('[TC-GAME-01] [FR-001] [NFR-007] FEATURE: Game state SCENARIO: Initialize GIVEN a new game is requested WHEN it is created THEN all 13 categories are unused AND five dice and no holds are initialized', () => {
    const game = createGame();
    expect(CATEGORIES).toHaveLength(13);
    expect(Object.values(game.scores)).toHaveLength(13);
    expect(Object.values(game.scores).every((score) => score === null)).toBe(true);
    expect(game.dice).toHaveLength(5);
    expect(game.held).toEqual([false, false, false, false, false]);
  });

  it('[TC-GAME-02] [FR-002] [NFR-007] FEATURE: Turn play SCENARIO: Roll and reroll GIVEN a game has started WHEN the player rolls and then rerolls THEN all dice change on the first roll AND held dice retain their values', () => {
    const opened = rollTurn(createGame(), () => 0.99);
    expect(opened.dice).toEqual([6, 6, 6, 6, 6]);
    const held = toggleHeld(opened, 0);
    const rerolled = rollTurn(held, () => 0);
    expect(rerolled.dice).toEqual([6, 1, 1, 1, 1]);
    expect(rerolled.rolls).toBe(2);
  });

  it('[TC-GAME-03] [FR-002] [NFR-007] FEATURE: Turn play SCENARIO: Enforce roll limit GIVEN all dice are held or three rolls have been used WHEN another roll is requested THEN the roll count advances only for a permitted roll AND no fourth roll occurs', () => {
    let game = rollTurn(createGame(), () => 0.2);
    for (let index = 0; index < 5; index += 1) game = toggleHeld(game, index);
    const heldRoll = rollTurn(game, () => {
      throw new Error('Held dice should not be rerolled.');
    });
    expect(heldRoll.rolls).toBe(2);
    game = rollTurn({ ...heldRoll, held: Array(5).fill(false) }, () => 0.5);
    expect(game.rolls).toBe(3);
    expect(rollTurn(game, () => 0)).toBe(game);
    expect(rollTurn({ ...game, finished: true }, () => 0)).toBeDefined();
  });

  it('[TC-GAME-04] [FR-003] [NFR-007] FEATURE: Input validation SCENARIO: Validate random source GIVEN a roll receives an invalid random source or sample WHEN dice are generated THEN the rules module rejects the input', () => {
    expect(() => rollTurn(createGame(), 1)).toThrow(TypeError);
    expect(() => rollTurn(createGame(), () => -0.01)).toThrow(RangeError);
    expect(() => rollTurn(createGame(), () => 1)).toThrow(RangeError);
  });

  it('[TC-GAME-05] [FR-002] [FR-003] [NFR-007] FEATURE: Turn play SCENARIO: Toggle held dice GIVEN a turn is in progress WHEN a die is held or released THEN only a valid die index can change between rolls one and two', () => {
    const fresh = createGame();
    expect(toggleHeld(fresh, 0)).toBe(fresh);
    const opened = rollTurn(fresh, () => 0.1);
    expect(toggleHeld(opened, 4).held[4]).toBe(true);
    expect(toggleHeld(toggleHeld(opened, 4), 4).held[4]).toBe(false);
    expect(toggleHeld({ ...opened, rolls: 3 }, 4)).toMatchObject({ held: opened.held });
    expect(toggleHeld({ ...opened, finished: true }, 4)).toBeDefined();
    for (const index of [-1, 5, 1.5]) expect(() => toggleHeld(opened, index)).toThrow(RangeError);
  });
});

describe('scoring categories', () => {
  it('[TC-GAME-06] [FR-004] [NFR-007] FEATURE: Category scoring SCENARIO: Score upper categories GIVEN five valid dice are rolled WHEN an upper category is evaluated THEN the score is the sum of dice matching that face', () => {
    const dice = [1, 2, 3, 4, 5];
    expect(
      ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].map((id) => scoreCategory(id, dice)),
    ).toEqual([1, 2, 3, 4, 5, 0]);
  });

  it('[TC-GAME-07] [FR-004] [NFR-007] FEATURE: Category scoring SCENARIO: Score groups and chance GIVEN five valid dice are rolled WHEN a kind, full house, or chance category is evaluated THEN its documented score or zero is returned', () => {
    expect(scoreCategory('three-kind', [2, 2, 2, 4, 5])).toBe(15);
    expect(scoreCategory('three-kind', [2, 2, 4, 4, 5])).toBe(0);
    expect(scoreCategory('four-kind', [3, 3, 3, 3, 6])).toBe(18);
    expect(scoreCategory('four-kind', [3, 3, 3, 4, 6])).toBe(0);
    expect(scoreCategory('full-house', [1, 1, 1, 6, 6])).toBe(25);
    expect(scoreCategory('full-house', [1, 1, 1, 1, 6])).toBe(0);
    expect(scoreCategory('full-house', [4, 4, 4, 4, 4])).toBe(0);
    expect(scoreCategory('five-kind', [5, 5, 5, 5, 5])).toBe(50);
    expect(scoreCategory('five-kind', [5, 5, 5, 5, 4])).toBe(0);
    expect(scoreCategory('chance', [1, 2, 3, 4, 5])).toBe(15);
  });

  it('[TC-GAME-08] [FR-004] [NFR-007] FEATURE: Category scoring SCENARIO: Score straights GIVEN five valid dice are rolled WHEN a straight category is evaluated THEN only the required distinct consecutive values earn its fixed score', () => {
    expect(scoreCategory('small-straight', [1, 2, 3, 4, 6])).toBe(30);
    expect(scoreCategory('small-straight', [2, 3, 4, 5, 5])).toBe(30);
    expect(scoreCategory('small-straight', [3, 4, 5, 6, 6])).toBe(30);
    expect(scoreCategory('small-straight', [1, 2, 4, 5, 6])).toBe(0);
    expect(scoreCategory('large-straight', [1, 2, 3, 4, 5])).toBe(40);
    expect(scoreCategory('large-straight', [2, 3, 4, 5, 6])).toBe(40);
    expect(scoreCategory('large-straight', [1, 2, 3, 4, 4])).toBe(0);
  });

  it('[TC-GAME-09] [FR-003] [NFR-007] FEATURE: Input validation SCENARIO: Validate scoring input GIVEN scoring receives an unknown category or malformed dice WHEN the score is evaluated THEN the rules module rejects the input', () => {
    expect(() => scoreCategory('unknown', [1, 2, 3, 4, 5])).toThrow(RangeError);
    expect(() => scoreCategory('chance', [1, 2])).toThrow(TypeError);
    expect(() => scoreCategory('chance', '12345')).toThrow(TypeError);
    expect(() => scoreCategory('chance', [1, 2, 3, 4, 7])).toThrow(RangeError);
    expect(() => scoreCategory('chance', [1, 2, 3, 4, 1.5])).toThrow(RangeError);
  });
});

describe('score sheet and totals', () => {
  it('[TC-GAME-10] [FR-003] [FR-005] [NFR-007] FEATURE: Score submission SCENARIO: Reject invalid submissions GIVEN a game is finished, unrolled, or the category is invalid or used WHEN a score is submitted THEN submission is rejected', () => {
    expect(() => submitScore(createGame(), 'chance')).toThrow('Roll the dice');
    const rolled = rollTurn(createGame(), () => 0.4);
    expect(() => submitScore(rolled, 'invalid')).toThrow(RangeError);
    expect(() =>
      submitScore({ ...rolled, scores: { ...rolled.scores, chance: 0 } }, 'chance'),
    ).toThrow('already been used');
    expect(() => submitScore({ ...rolled, finished: true }, 'chance')).toThrow('already finished');
  });

  it('[TC-GAME-11] [FR-005] [NFR-007] FEATURE: Score submission SCENARIO: Commit a category GIVEN at least one roll and an unused category WHEN the player submits that category THEN its score is recorded AND turn controls are reset', () => {
    const next = submitScore(
      rollTurn(createGame(), () => 0),
      'ones',
    );
    expect(next.scores.ones).toBe(5);
    expect(next).toMatchObject({ turn: 1, rolls: 0, finished: false });
    expect(next.held).toEqual([false, false, false, false, false]);
  });

  it('[TC-GAME-12] [FR-006] [NFR-007] FEATURE: Repeat bonus SCENARIO: Award a qualifying bonus GIVEN 50 points have been scored in Five of a Kind WHEN a later all-matching roll is scored THEN a 100-point repeat bonus is awarded', () => {
    const opening = rollTurn(createGame(), () => 0.75);
    const scoredFiveKind = submitScore(opening, 'five-kind');
    expect(scoredFiveKind.scores['five-kind']).toBe(50);
    const repeated = submitScore({ ...scoredFiveKind, dice: [5, 5, 5, 5, 5], rolls: 3 }, 'chance');
    expect(repeated.bonus).toBe(100);

    const unqualified = {
      ...scoredFiveKind,
      scores: { ...scoredFiveKind.scores, 'five-kind': 0 },
      dice: [2, 2, 2, 2, 2],
      rolls: 1,
    };
    expect(submitScore(unqualified, 'chance').bonus).toBe(0);
    expect(
      submitScore({ ...scoredFiveKind, dice: [1, 1, 1, 1, 2], rolls: 1 }, 'chance').bonus,
    ).toBe(0);
  });

  it('[TC-GAME-13] [FR-007] [NFR-007] FEATURE: Score totals SCENARIO: Calculate totals GIVEN the score sheet contains upper and lower scores WHEN totals are calculated THEN 63 upper points earn 35 bonus points AND every section contributes to the total', () => {
    const below = createGame();
    below.scores = {
      ...below.scores,
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 17,
    };
    expect(getTotals(below)).toMatchObject({ upper: 62, upperBonus: 0, total: 62 });
    const atThreshold = {
      ...below,
      scores: { ...below.scores, sixes: 18, chance: 20 },
      bonus: 100,
    };
    expect(getTotals(atThreshold)).toEqual({
      upper: 63,
      upperBonus: 35,
      lower: 20,
      repeatBonus: 100,
      total: 218,
    });
  });

  it('[TC-GAME-14] [FR-008] [NFR-007] FEATURE: Game completion SCENARIO: Finish after 13 categories GIVEN a game has unused categories WHEN all 13 categories are scored THEN the game finishes AND further scoring is rejected', () => {
    let game = createGame();
    for (const { id } of CATEGORIES) {
      game = rollTurn(game, () => 0);
      game = submitScore(game, id);
    }
    expect(game).toMatchObject({ turn: 13, finished: true });
    expect(() => submitScore(game, 'chance')).toThrow('already finished');
  });
});
