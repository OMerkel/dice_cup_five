import { createDiceScene } from './dice-scene.js';
import {
  CATEGORIES,
  createGame,
  getTotals,
  rollTurn,
  scoreCategory,
  submitScore,
  toggleHeld,
} from './game.js';
import { playRollSound } from './sound.js';

const RULES = {
  ones: 'Sum 1s',
  twos: 'Sum 2s',
  threes: 'Sum 3s',
  fours: 'Sum 4s',
  fives: 'Sum 5s',
  sixes: 'Sum 6s',
  'three-kind': '3 alike · sum all',
  'four-kind': '4 alike · sum all',
  'full-house': '3 + 2 alike',
  'small-straight': '4 in a row',
  'large-straight': '5 in a row',
  'five-kind': '5 alike',
  chance: 'Sum all dice',
};

const elements = {
  turnIndicator: document.querySelector('#turn-indicator'),
  roundLabel: document.querySelector('#round-label'),
  playTitle: document.querySelector('#play-title'),
  rollCount: document.querySelector('#roll-count'),
  diceCanvas: document.querySelector('#dice-canvas'),
  diceControls: document.querySelector('#dice-controls'),
  stage: document.querySelector('#dice-stage'),
  stageMessage: document.querySelector('#stage-message'),
  turnStartOverlay: document.querySelector('#turn-start-overlay'),
  turnHint: document.querySelector('#turn-hint'),
  rollButton: document.querySelector('#roll-button'),
  scoreHint: document.querySelector('#score-hint'),
  scorecardCount: document.querySelector('#scorecard-count'),
  scoreSheet: document.querySelector('#score-sheet'),
  upperTotal: document.querySelector('#upper-total'),
  upperBonus: document.querySelector('#upper-bonus'),
  lowerTotal: document.querySelector('#lower-total'),
  repeatBonus: document.querySelector('#repeat-bonus'),
  grandTotal: document.querySelector('#grand-total'),
  soundButton: document.querySelector('#sound-button'),
  fullscreenButton: document.querySelector('#fullscreen-button'),
  newGameButton: document.querySelector('#new-game-button'),
  aboutButton: document.querySelector('#about-button'),
  aboutDialog: document.querySelector('#about-dialog'),
  closeAboutButton: document.querySelector('#close-about-button'),
  gameOver: document.querySelector('#game-over'),
  playAgainButton: document.querySelector('#play-again-button'),
};

let game = createGame();
let diceScene;
let lastMessage = '';
let soundMuted = localStorage.getItem('dice-cup-five-muted') === 'true';

try {
  diceScene = createDiceScene(elements.diceCanvas, game.dice);
} catch (error) {
  console.error('3D dice could not be initialized.', error);
  elements.stage.classList.add('fallback-dice');
  elements.stageMessage.textContent = '3D unavailable · showing the roll';
}

function render() {
  const completed = game.turn;
  const turnNumber = Math.min(completed + 1, CATEGORIES.length);
  const totals = getTotals(game);
  const used = Object.values(game.scores).filter((score) => score !== null).length;

  elements.turnIndicator.textContent = `TURN ${String(turnNumber).padStart(2, '0')} / 13`;
  elements.roundLabel.textContent = game.finished
    ? 'GAME COMPLETE'
    : `YOUR TURN · ROUND ${String(turnNumber).padStart(2, '0')}`;
  elements.playTitle.textContent = game.finished ? 'That’s the game.' : 'Make it count.';
  elements.rollCount.textContent = String(game.rolls);
  elements.scorecardCount.textContent = `${used} / 13`;
  elements.upperTotal.textContent = String(totals.upper);
  elements.upperBonus.textContent = String(totals.upperBonus);
  elements.lowerTotal.textContent = String(totals.lower);
  elements.repeatBonus.textContent = String(totals.repeatBonus);
  elements.grandTotal.textContent = String(totals.total);
  elements.gameOver.hidden = !game.finished;
  elements.turnStartOverlay.hidden = game.rolls > 0 || game.finished;

  if (game.finished) {
    elements.stageMessage.textContent = 'A game well played';
    elements.turnHint.querySelector('span:last-child').textContent =
      'Your final score is on the card.';
    elements.scoreHint.textContent = 'The scorecard is complete.';
  } else if (lastMessage) {
    elements.stageMessage.textContent = lastMessage;
    elements.turnHint.querySelector('span:last-child').textContent =
      'Roll all five to begin the next turn.';
    elements.scoreHint.textContent = 'Your score is recorded. A new turn is ready.';
  } else if (game.rolls === 0) {
    elements.stageMessage.textContent = 'Ready when you are';
    elements.turnHint.querySelector('span:last-child').textContent =
      'Roll all five to start your turn.';
    elements.scoreHint.textContent =
      'After rolling, choose a row on the scorecard to lock in your points.';
  } else if (game.rolls < 3) {
    elements.stageMessage.textContent = `${3 - game.rolls} ${game.rolls === 2 ? 'roll' : 'rolls'} left`;
    elements.turnHint.querySelector('span:last-child').textContent =
      'Tap dice to keep them, or score now.';
    elements.scoreHint.textContent = 'Choose any available scorecard row to end the turn early.';
  } else {
    elements.stageMessage.textContent = 'Last roll complete';
    elements.turnHint.querySelector('span:last-child').textContent =
      'Choose a category to score this turn.';
    elements.scoreHint.textContent = 'All three rolls are used. Select a scorecard row.';
  }

  elements.turnHint.querySelector('.hint-index').textContent = String(turnNumber).padStart(2, '0');
  elements.rollButton.disabled = game.finished || game.rolls >= 3;
  elements.rollButton.querySelector('.roll-label').textContent =
    game.rolls === 0 ? 'Roll dice' : 'Roll again';
  renderDiceControls();
  renderScoreSheet();
}

function renderDiceControls() {
  elements.diceControls.replaceChildren();
  const layout = diceScene?.getDieLayout?.();
  game.dice.forEach((value, index) => {
    const button = document.createElement('button');
    const held = game.held[index];
    button.type = 'button';
    button.className = `die-toggle${held ? ' is-held' : ''}`;
    if (layout) {
      button.style.position = 'absolute';
      button.style.height = '100%';
      button.style.left = `${layout[index].left * 100}%`;
      button.style.width = `${layout[index].width * 100}%`;
    }
    button.disabled = game.rolls === 0 || game.rolls >= 3 || game.finished;
    button.setAttribute('aria-pressed', String(held));
    button.setAttribute(
      'aria-label',
      `Die ${index + 1}: ${value}${held ? ', kept' : ', rerolling'}`,
    );
    button.innerHTML = `<span class="die-value">${value}</span><span class="die-hold-label">${held ? 'KEPT' : 'HOLD'}</span>`;
    button.addEventListener('click', () => {
      game = toggleHeld(game, index);
      render();
    });
    elements.diceControls.append(button);
  });
}

elements.diceCanvas.addEventListener('dice-layout-change', renderDiceControls);

function renderScoreSheet() {
  elements.scoreSheet.replaceChildren();
  for (const [section, title, note] of [
    ['upper', 'Upper section', '63 earns +35'],
    ['lower', 'Lower section', ''],
  ]) {
    const groupTitle = document.createElement('div');
    groupTitle.className = 'score-group-title';
    groupTitle.innerHTML = `<span>${title}</span><small>${note}</small>`;
    elements.scoreSheet.append(groupTitle);

    for (const category of CATEGORIES.filter((item) => item.section === section)) {
      const score = game.scores[category.id];
      const available = score === null && game.rolls > 0 && !game.finished;
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `score-row${available ? ' is-available' : ''}${score !== null ? ' is-scored' : ''}`;
      row.disabled = !available;
      row.setAttribute(
        'aria-label',
        score !== null
          ? `${category.label}: ${score} points, already scored`
          : available
            ? `Score ${scoreCategory(category.id, game.dice)} points in ${category.label}`
            : `${category.label}: score preview available after rolling`,
      );
      row.innerHTML = `<span class="category-name">${category.label}</span><span class="category-rule">${RULES[category.id]}</span><span class="category-score">${score ?? (game.rolls > 0 ? scoreCategory(category.id, game.dice) : '–')}</span>`;
      if (available) {
        row.addEventListener('click', () => scoreTurn(category.id));
      }
      elements.scoreSheet.append(row);
    }
  }
}

function scoreTurn(categoryId) {
  const previousBonus = game.bonus;
  game = submitScore(game, categoryId);
  const earnedBonus = game.bonus - previousBonus;
  const category = CATEGORIES.find((item) => item.id === categoryId);
  lastMessage = earnedBonus > 0 ? 'Five of a Kind · +100 bonus' : `${category.label} · scored`;
  if (game.finished) lastMessage = '';
  render();
}

elements.rollButton.addEventListener('click', () => {
  game = rollTurn(game);
  lastMessage = '';
  diceScene?.roll(game.dice, game.held);
  playRollSound(soundMuted);
  render();
});

function startNewGame() {
  game = createGame();
  lastMessage = '';
  diceScene?.roll(game.dice);
  render();
}

elements.newGameButton.addEventListener('click', startNewGame);
elements.playAgainButton.addEventListener('click', startNewGame);

elements.aboutButton.addEventListener('click', () => elements.aboutDialog.showModal());
elements.closeAboutButton.addEventListener('click', () => elements.aboutDialog.close());

elements.soundButton.addEventListener('click', () => {
  soundMuted = !soundMuted;
  localStorage.setItem('dice-cup-five-muted', String(soundMuted));
  updateSoundButton();
});

function updateSoundButton() {
  const label = soundMuted ? 'Turn sound on' : 'Mute sound';
  elements.soundButton.title = label;
  elements.soundButton.setAttribute('aria-label', label);
  elements.soundButton.innerHTML = `<span class="glyph" aria-hidden="true">${soundMuted ? '×' : '♫'}</span>`;
}

elements.fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch (error) {
    console.warn('Fullscreen is unavailable in this browser.', error);
  }
});

document.addEventListener('fullscreenchange', () => {
  const fullscreen = Boolean(document.fullscreenElement);
  const label = fullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
  elements.fullscreenButton.title = label;
  elements.fullscreenButton.setAttribute('aria-label', label);
  elements.fullscreenButton.innerHTML = `<span class="glyph" aria-hidden="true">${fullscreen ? '⤡' : '⛶'}</span>`;
});

document.addEventListener('keydown', (event) => {
  if (elements.aboutDialog.open) return;
  if (event.code === 'Space' && !event.target.closest('button')) {
    event.preventDefault();
    elements.rollButton.click();
  }
  if (event.key.toLowerCase() === 'f' && !event.target.closest('button')) {
    elements.fullscreenButton.click();
  }
});

window.addEventListener('beforeunload', () => diceScene?.dispose(), { once: true });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('Offline support could not be registered.', error);
  });
}

updateSoundButton();
render();
