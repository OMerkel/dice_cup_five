import { beforeAll, describe, expect, it, vi } from 'vitest';

const { createDiceSceneMock } = vi.hoisted(() => ({
  createDiceSceneMock: vi.fn(),
}));

vi.mock('../src/dice-scene.js', () => ({ createDiceScene: createDiceSceneMock }));

beforeAll(async () => {
  document.body.innerHTML = `
    <span id="turn-indicator"></span><p id="round-label"></p><h1 id="play-title"></h1>
    <strong id="roll-count"></strong><canvas id="dice-canvas"></canvas>
    <div id="dice-controls"></div><div id="dice-stage"><span id="stage-message"></span></div>
    <div id="turn-start-overlay">Roll dice to start your turn</div>
    <div id="turn-hint"><span class="hint-index"></span><span></span></div>
    <button id="roll-button"><span class="glyph">⚄</span><span class="roll-label"></span></button><p id="score-hint"></p>
    <span id="scorecard-count"></span><div id="score-sheet"></div>
    <span id="upper-total"></span><span id="upper-bonus"></span><span id="lower-total"></span>
    <span id="repeat-bonus"></span><span id="grand-total"></span>
    <button id="sound-button"><span class="glyph">♫</span></button>
    <button id="fullscreen-button"><span class="glyph">⛶</span></button>
    <button id="new-game-button"><span class="glyph">↻</span></button>
    <button id="about-button"></button>
    <dialog id="about-dialog"><button id="close-about-button"></button><p>MIT License</p></dialog>
    <div id="game-over" hidden><button id="play-again-button"></button></div>
  `;
  localStorage.clear();
  window.AudioContext = undefined;
  window.webkitAudioContext = undefined;
  createDiceSceneMock.mockImplementation(() => {
    throw new Error('No WebGL context');
  });
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  await import('../src/main.js');
  expect(consoleError).toHaveBeenCalledOnce();
});

describe('game screen', () => {
  it('opens and closes About without triggering game shortcuts behind the modal', () => {
    const dialog = document.querySelector('#about-dialog');
    dialog.showModal = vi.fn(() => {
      dialog.open = true;
    });
    dialog.close = vi.fn(() => {
      dialog.open = false;
    });
    const rollCount = document.querySelector('#roll-count').textContent;
    const requestFullscreen = vi.fn();
    document.documentElement.requestFullscreen = requestFullscreen;

    document.querySelector('#about-button').click();
    expect(dialog.showModal).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(true);
    for (const [code, key] of [
      ['Space', ' '],
      ['KeyF', 'f'],
    ]) {
      dialog
        .querySelector('p')
        .dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true }));
    }
    expect(document.querySelector('#roll-count').textContent).toBe(rollCount);
    expect(requestFullscreen).not.toHaveBeenCalled();

    document.querySelector('#close-about-button').click();
    expect(dialog.close).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(false);
  });

  it('[TC-UI-01] [FR-009] [FR-011] [FR-012] [FR-013] [FR-014] [NFR-004] [NFR-006] FEATURE: Game screen SCENARIO: Play and restart GIVEN the game screen is active WHEN the player rolls, scores, uses utilities, and completes or restarts a game THEN screen state, accessible controls, persisted mute preference, and game lifecycle stay consistent', async () => {
    const rollButton = document.querySelector('#roll-button');
    const nextAvailableScore = () => document.querySelector('.score-row.is-available');

    expect(document.querySelector('#turn-indicator').textContent).toBe('TURN 01 / 13');
    expect(document.querySelector('#dice-stage').classList.contains('fallback-dice')).toBe(true);
    expect(document.querySelector('.score-row').getAttribute('aria-label')).toContain(
      'after rolling',
    );
    expect(document.querySelector('.die-toggle').disabled).toBe(true);
    expect(document.querySelector('#turn-start-overlay').hidden).toBe(false);

    rollButton.click();
    expect(document.querySelector('#roll-count').textContent).toBe('1');
    expect(document.querySelector('#turn-start-overlay').hidden).toBe(true);
    document.querySelector('.die-toggle').click();
    expect(document.querySelector('.die-toggle').getAttribute('aria-pressed')).toBe('true');
    rollButton.click();
    expect(document.querySelector('#stage-message').textContent).toBe('1 roll left');
    rollButton.click();
    expect(document.querySelector('#stage-message').textContent).toBe('Last roll complete');
    expect(rollButton.disabled).toBe(true);
    nextAvailableScore().click();
    expect(document.querySelector('#turn-indicator').textContent).toBe('TURN 02 / 13');
    expect(document.querySelector('#turn-hint').textContent).toContain('Roll all five to begin');
    expect(rollButton.disabled).toBe(false);
    expect(document.querySelector('#turn-start-overlay').hidden).toBe(false);

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    rollButton.click();
    const fiveKind = [...document.querySelectorAll('.score-row')].find(
      (row) => row.querySelector('.category-name').textContent === 'Five of a Kind',
    );
    fiveKind.click();
    rollButton.click();
    const chance = [...document.querySelectorAll('.score-row')].find(
      (row) => row.querySelector('.category-name').textContent === 'Chance',
    );
    chance.click();
    expect(document.querySelector('#repeat-bonus').textContent).toBe('100');
    expect(document.querySelector('#stage-message').textContent).toBe(
      'Five of a Kind · +100 bonus',
    );

    const soundButton = document.querySelector('#sound-button');
    soundButton.click();
    expect(localStorage.getItem('dice-cup-five-muted')).toBe('true');
    expect(soundButton.getAttribute('aria-label')).toBe('Turn sound on');
    soundButton.click();
    expect(soundButton.getAttribute('aria-label')).toBe('Mute sound');

    let fullscreen = null;
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreen,
    });
    document.documentElement.requestFullscreen = vi.fn(async () => {
      fullscreen = document.documentElement;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    document.exitFullscreen = vi.fn(async () => {
      fullscreen = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    const fullscreenButton = document.querySelector('#fullscreen-button');
    fullscreenButton.click();
    await vi.waitFor(() =>
      expect(fullscreenButton.getAttribute('aria-label')).toBe('Exit fullscreen'),
    );
    fullscreenButton.click();
    await vi.waitFor(() =>
      expect(fullscreenButton.getAttribute('aria-label')).toBe('Enter fullscreen'),
    );
    document.documentElement.requestFullscreen.mockRejectedValueOnce(new Error('Unavailable'));
    const consoleWarning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fullscreenButton.click();
    await vi.waitFor(() => expect(consoleWarning).toHaveBeenCalled());

    document.querySelector('#new-game-button').click();
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }),
    );
    expect(document.querySelector('#roll-count').textContent).toBe('1');
    document
      .querySelector('#roll-button')
      .dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
    expect(document.querySelector('#roll-count').textContent).toBe('1');
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyF', key: 'f', bubbles: true }),
    );

    document.querySelector('#new-game-button').click();
    for (let turn = 0; turn < 13; turn += 1) {
      rollButton.click();
      nextAvailableScore().click();
    }
    expect(document.querySelector('#game-over').hidden).toBe(false);
    expect(document.querySelector('#play-title').textContent).toBe('That’s the game.');
    expect(document.querySelector('#turn-start-overlay').hidden).toBe(true);
    document.querySelector('#play-again-button').click();
    expect(document.querySelector('#scorecard-count').textContent).toBe('0 / 13');
    expect(document.querySelector('#game-over').hidden).toBe(true);
    expect(document.querySelector('#turn-start-overlay').hidden).toBe(false);
    window.dispatchEvent(new Event('beforeunload'));
  });

  it('[TC-UI-02] [FR-010] [NFR-005] [NFR-008] FEATURE: Dice selection SCENARIO: Align controls and hold dice GIVEN the 3D scene provides projected die positions WHEN the player resizes the layout and holds dice THEN controls align with the rendered dice AND held values are excluded from the next roll', async () => {
    document.body.replaceChildren(
      ...[...document.body.childNodes].map((node) => node.cloneNode(true)),
    );
    vi.resetModules();
    const scene = {
      roll: vi.fn(),
      dispose: vi.fn(),
      getDieLayout: vi.fn(() =>
        Array.from({ length: 5 }, (_, index) => ({ left: 0.2 + index * 0.1, width: 0.1 })),
      ),
    };
    createDiceSceneMock.mockReturnValue(scene);
    await import('../src/main.js');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const rollButton = document.querySelector('#roll-button');

    expect(document.querySelector('.die-toggle').style.left).toBe('20%');
    expect(document.querySelector('.die-toggle').style.width).toBe('10%');
    scene.getDieLayout.mockReturnValue(
      Array.from({ length: 5 }, (_, index) => ({ left: 0.1 + index * 0.16, width: 0.16 })),
    );
    document.querySelector('#dice-canvas').dispatchEvent(new Event('dice-layout-change'));
    expect(document.querySelector('.die-toggle').style.left).toBe('10%');

    rollButton.click();
    document.querySelectorAll('.die-toggle')[0].click();
    document.querySelectorAll('.die-toggle')[2].click();
    random.mockReturnValue(0);
    rollButton.click();

    expect(scene.roll).toHaveBeenLastCalledWith([6, 1, 6, 1, 1], [true, false, true, false, false]);
    expect([...document.querySelectorAll('.die-value')].map((die) => die.textContent)).toEqual([
      '6',
      '1',
      '6',
      '1',
      '1',
    ]);
    window.dispatchEvent(new Event('beforeunload'));
    random.mockRestore();
  });
});
