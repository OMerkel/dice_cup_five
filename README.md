# Dice Cup Five

**Five dice. Three rolls. Thirteen chances to make them count.**

Dice Cup Five is a browser-based, single-player dice game with animated 3D dice and a live scorecard. Keep the dice you like, reroll the rest, and choose where to record your points.

## Play Online

- [Start game now...](https://omerkel.github.io/dice_cup_five/javascript/html5/src/)

## Highlights

- **Animated 3D dice** rendered with Three.js, with a numeric fallback when WebGL is unavailable.
- **Keep and reroll** individual dice using selection areas aligned with the rendered dice.
- **Live scoring suggestions** framed with dashed borders so available categories are easy to spot.
- **A complete scorecard** with 13 categories, an upper-section bonus, and repeat Five of a Kind bonuses.
- **Responsive layout**, synthesized roll sounds, sound muting, and fullscreen controls.
- **About dialog** with authorship information, license text, and third-party notices.
- **Offline support** through a service worker and a web app manifest.

## Quick Start

Use a current Node.js LTS release, such as **Node.js 24**, and npm. A modern browser with WebGL support provides the full 3D experience.

From the repository root:

```sh
cd javascript/html5
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. If that port is occupied, Vite selects another one.

> On Windows, make sure `node` resolves to Node.js rather than the Windows HPC tools. In PowerShell, `Get-Command node` shows which executable will run.

## How to Play

1. Roll all five dice to start a turn.
2. Select any dice you want to keep. Selected dice retain their values and do not animate on the next roll.
3. Reroll the remaining dice, up to a total of three rolls. Select a kept die again to release it.
4. Choose one unused scorecard category to record your points and end the turn. You can score after any roll, even if the category earns zero.
5. Complete all 13 categories and aim for the highest total.

An upper-section total of **63 or more earns 35 bonus points**. After recording **50 points in Five of a Kind**, a later five-matching-dice turn can earn a **100-point repeat bonus** when scored.

See [doc/rules.md](doc/rules.md) for every category and the complete scoring rules.

Game progress is held in memory and is lost when the page is reloaded or a new game is started. Only the sound mute preference is saved locally.

### Controls

| Control | Action |
| --- | --- |
| Click or tap a die | Keep it or release it between rolls |
| Roll button | Roll all unheld dice |
| Available scorecard row | Record that category and end the turn |
| Sound button | Mute or enable synthesized sounds |
| Fullscreen button | Enter or exit fullscreen |
| New game button | Reset the game |
| About button | Open the About dialog with author and license information |
| Close About button | Dismiss the About dialog and return to the game |
| `Space` | Roll when focus is outside a button |
| `F` | Toggle fullscreen when focus is outside a button |

Game shortcuts are inactive while the About dialog is open. Sound is synthesized in your browser.

## Documentation

- [Game rules](doc/rules.md): turn sequence, scoring categories, and bonuses.
- [Requirements](doc/requirements.md): functional and non-functional requirements, acceptance scenarios, and verification references.
- [Software architecture](doc/software_architecture.md): module responsibilities, runtime interactions, diagrams, deployment, and offline behavior.
- Translated rules: [German](doc/regeln.md), [Spanish](doc/reglas.md), [French](doc/regles.md), and [Italian](doc/regole.md).

## Development

Run these commands from `javascript/html5`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run the Vitest test suite |
| `npm run coverage` | Run tests with coverage reporting and thresholds |
| `npm run check` | Check formatting and lint rules with Biome |
| `npm run build` | Create the production build |
| `npm run preview` | Serve the production build locally |

To run the game-rule and screen tests only:

```sh
npm test -- test/game.test.js test/main.test.js
```

### Build and Host

```sh
npm run build
npm run preview
```

The production output is written to `javascript/html5/dist`. Deploy that directory to a static web host; no application server or database is required. The build uses relative asset paths, so it can also be hosted under a subdirectory.

**Non-functional requirement:** A live/static HTTP server must also be able to serve the application directly from `./javascript/html5/src`, without a build step or Vite. Direct source hosting must remain supported alongside the production build.

For direct source hosting, serve that directory over HTTP and open its `index.html` URL; opening the file with a `file://` URL is not supported. Runtime Three.js modules are vendored locally, so this hosting mode does not require npm dependencies or a CDN.

Service workers require HTTPS or localhost. Offline play is available after the worker has installed and cached the game assets. Additional About images and license notices may require a prior online visit before they are available offline. Offline caching does not save game progress. If a previously served version persists during development, clear that site's service worker and cache in your browser's developer tools.

## Repository Layout

```text
doc/
  rules.md                  Complete game rules
  regeln.md                 German rules
  reglas.md                 Spanish rules
  regles.md                 French rules
  regole.md                 Italian rules
  requirements.md           Requirements, scenarios, and verification references
  software_architecture.md  Modules, interactions, diagrams, and deployment
javascript/html5/
  package.json              Development commands and dependencies
  vite.config.js            Development and production build configuration
  vitest.config.js          Test environment and coverage thresholds
  src/
    game.js                 Turn state, scoring, and bonuses
    main.js                 Screen rendering and user interaction
    dice-scene.js           Three.js dice rendering and animation
    sound.js                Synthesized roll audio
    index.html              Application markup
    sw.js                   Service worker source
    manifest.webmanifest    Web app metadata
    img/
      dice-icon.svg         App icon; other images provide About artwork and license badges
    thirdparty/three/        Vendored Three.js and rounded-box geometry
    css/
      styles.css            Responsive presentation
  test/
    game.test.js             Game-rule and score tests
    main.test.js             Screen interaction tests
    sound.test.js            Synthesized sound tests
```

Game logic is separate from the browser interface: [javascript/html5/src/game.js](javascript/html5/src/game.js) owns the rules, while [javascript/html5/src/main.js](javascript/html5/src/main.js) connects state to the screen. Tests cover game rules, screen interactions, and sound behavior using Vitest and jsdom.

## Licensing

Application source code, including HTML, JavaScript, and CSS, is licensed under the [MIT License](LICENSE), copyright (c) 2026 Oliver Merkel.

As stated in the in-app About dialog, graphics are licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) unless otherwise indicated. The author portrait is licensed separately under [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/). Logos, brands, and trademarks belong to their respective owners.

### Third-Party Notices

Three.js and its RoundedBoxGeometry addon are vendored in this repository under the MIT License, copyright (c) 2010-2026 three.js authors. The notice is included at [javascript/html5/src/thirdparty/three/LICENSE](javascript/html5/src/thirdparty/three/LICENSE), linked from the About dialog, and copied into the production build. Vendoring details are in [javascript/html5/src/thirdparty/three/README.md](javascript/html5/src/thirdparty/three/README.md).
