# Dice Cup Five Requirements

## 1. Purpose and scope

This document records the requirements evidenced by the current Dice Cup Five
product description, rules, architecture, implementation, and tests. It is a
baseline for the implemented single-player browser game, not a backlog of
unimplemented features.

The requirements use **FR** for functional requirements and **NFR** for
non-functional requirements. Each requirement has a stable ID and a Gherkin
feature and scenario. Automated test case IDs are included in the test
function declarations in the source files, so the trace can be followed from a
requirement to a test and back. Verification cases marked **manual** describe
acceptance checks not currently automated by the repository's test suite.

## 2. System context and architecture modules

Dice Cup Five is a single-player game running in a browser. It has no application
backend, database, account system, or network game protocol. It can be served
as unbundled source files over HTTP or deployed as a Vite production build.

| Module / component | Responsibility | Primary source |
| --- | --- | --- |
| Game rules | Authoritative game state, turn transitions, scoring, and totals; independent of browser APIs. | [`game.js`](../javascript/html5/src/game.js) |
| Screen controller | Connects game state to the DOM, handles user actions, previews, labels, mute preference, fullscreen, and worker registration. | [`main.js`](../javascript/html5/src/main.js) |
| Dice scene | Creates and animates the Three.js dice scene, reports projected interaction layout, and disposes graphics resources. | [`dice-scene.js`](../javascript/html5/src/dice-scene.js) |
| Sound | Synthesizes roll noise and impacts through Web Audio when supported and enabled. | [`sound.js`](../javascript/html5/src/sound.js) |
| Static interface | Provides application structure, accessibility landmarks, and responsive presentation. | [`index.html`](../javascript/html5/src/index.html), [`styles.css`](../javascript/html5/src/css/styles.css) |
| Offline worker and metadata | Pre-caches application assets, serves same-origin GET requests cache-first, and describes app identity and launch metadata. | [`sw.js`](../javascript/html5/src/sw.js), [`manifest.webmanifest`](../javascript/html5/src/manifest.webmanifest) |
| Build and verification | Configures direct-source development, relative-path production output, automated tests, coverage thresholds, and code checks. | [`vite.config.js`](../javascript/html5/vite.config.js), [`vitest.config.js`](../javascript/html5/vitest.config.js), [`package.json`](../javascript/html5/package.json) |

The rules in [`rules.md`](rules.md) are the normative scoring reference. The
architecture description is in
[`software_architecture.md`](software_architecture.md); setup, play, and
deployment guidance is in the repository [`README.md`](../README.md).

## 3. Functional requirements

### FR-001 — Initialize a new game

**Feature:** Game state management  
**Scenario:** Create an unused scorecard and ready turn

```gherkin
FEATURE: Game state management
  SCENARIO: Create an unused scorecard and ready turn
    GIVEN the player requests a new game
    WHEN the game state is created
    THEN all 13 scoring categories SHALL be unused
    AND the state SHALL contain five dice, no held dice, zero rolls, and zero completed turns
```

**Verification:** [`TC-GAME-01`](../javascript/html5/test/game.test.js).

### FR-002 — Roll dice and hold selections

**Feature:** Turn play  
**Scenario:** Roll up to three times while retaining selected dice

```gherkin
FEATURE: Turn play
  SCENARIO: Roll up to three times while retaining selected dice
    GIVEN an unfinished game with fewer than three rolls in the current turn
    WHEN the player rolls for the first time
    THEN all five dice SHALL receive new values
    WHEN the player holds dice and rolls again
    THEN held dice SHALL retain their values
    AND unheld dice SHALL receive new values
    AND a permitted roll SHALL consume one roll even when every die is held
    WHEN three rolls have been used or the game is finished
    THEN another roll SHALL NOT change the game state
```

**Verification:** [`TC-GAME-02`](../javascript/html5/test/game.test.js),
[`TC-GAME-03`](../javascript/html5/test/game.test.js),
[`TC-GAME-05`](../javascript/html5/test/game.test.js).

### FR-003 — Validate rule inputs

**Feature:** Game input validation  
**Scenario:** Reject invalid random sources, dice, indexes, and categories

```gherkin
FEATURE: Game input validation
  SCENARIO: Reject invalid rule inputs
    GIVEN a roll, die selection, or score calculation receives invalid input
    WHEN the rules module validates the operation
    THEN it SHALL reject invalid random sources or samples
    AND it SHALL reject die indexes outside the five-die range
    AND it SHALL reject malformed dice and unknown scoring categories
```

**Verification:** [`TC-GAME-04`](../javascript/html5/test/game.test.js),
[`TC-GAME-05`](../javascript/html5/test/game.test.js),
[`TC-GAME-09`](../javascript/html5/test/game.test.js),
[`TC-GAME-10`](../javascript/html5/test/game.test.js).

### FR-004 — Score all 13 categories

**Feature:** Category scoring  
**Scenario:** Calculate a category score from five dice

```gherkin
FEATURE: Category scoring
  SCENARIO: Calculate a category score from five dice
    GIVEN five valid six-sided dice
    WHEN an upper category is evaluated
    THEN Ones, Twos, Threes, Fours, Fives, or Sixes SHALL score the sum of dice showing that face
    WHEN Three of a Kind is evaluated
    THEN it SHALL score the sum of all dice if at least three dice match, or zero otherwise
    WHEN Four of a Kind is evaluated
    THEN it SHALL score the sum of all dice if at least four dice match, or zero otherwise
    WHEN Full House is evaluated
    THEN it SHALL score 25 for a three-and-two grouping, or zero otherwise
    WHEN Small Straight is evaluated
    THEN it SHALL score 30 if at least four distinct consecutive values appear, or zero otherwise
    WHEN Large Straight is evaluated
    THEN it SHALL score 40 if five consecutive values appear, or zero otherwise
    WHEN Five of a Kind is evaluated
    THEN it SHALL score 50 if all five dice match, or zero otherwise
    WHEN Chance is evaluated
    THEN it SHALL score the sum of all five dice
```

**Verification:** [`TC-GAME-06`](../javascript/html5/test/game.test.js),
[`TC-GAME-07`](../javascript/html5/test/game.test.js),
[`TC-GAME-08`](../javascript/html5/test/game.test.js).

### FR-005 — Submit one unused category per turn

**Feature:** Score submission  
**Scenario:** Commit a category after rolling and advance the turn

```gherkin
FEATURE: Score submission
  SCENARIO: Commit a category after rolling and advance the turn
    GIVEN the player has rolled at least once and a category is unused
    WHEN the player submits that category
    THEN its calculated score, including zero, SHALL be recorded
    AND the turn SHALL advance
    AND the roll count and held dice SHALL reset
    WHEN the game is unrolled, finished, or the category has already been used
    THEN the submission SHALL be rejected
```

**Verification:** [`TC-GAME-10`](../javascript/html5/test/game.test.js),
[`TC-GAME-11`](../javascript/html5/test/game.test.js),
[`TC-UI-01`](../javascript/html5/test/main.test.js).

### FR-006 — Award repeat Five of a Kind bonuses

**Feature:** Repeat Five of a Kind bonus  
**Scenario:** Award a bonus only after scoring the original Five of a Kind

```gherkin
FEATURE: Repeat Five of a Kind bonus
  SCENARIO: Award a qualifying repeat bonus
    GIVEN the player has recorded 50 points in Five of a Kind
    WHEN the player submits a later turn with all five dice matching
    THEN 100 repeat-bonus points SHALL be added
    AND the player SHALL still submit an unused category for that turn
    WHEN the prior Five of a Kind score is not 50 or the later dice do not all match
    THEN no repeat bonus SHALL be added
```

**Verification:** [`TC-GAME-12`](../javascript/html5/test/game.test.js),
[`TC-UI-01`](../javascript/html5/test/main.test.js).

### FR-007 — Calculate score totals and upper bonus

**Feature:** Score totals  
**Scenario:** Derive section totals and bonuses

```gherkin
FEATURE: Score totals
  SCENARIO: Derive section totals and bonuses
    GIVEN scores have been recorded in either section
    WHEN game totals are calculated
    THEN upper and lower totals SHALL equal their recorded category sums
    AND an upper total of at least 63 SHALL earn 35 bonus points
    AND repeat bonuses SHALL be included in the grand total
```

**Verification:** [`TC-GAME-13`](../javascript/html5/test/game.test.js),
[`TC-UI-01`](../javascript/html5/test/main.test.js).

### FR-008 — Complete the game after 13 categories

**Feature:** Game completion  
**Scenario:** Finish after every category has been assigned

```gherkin
FEATURE: Game completion
  SCENARIO: Finish after every category has been assigned
    GIVEN the player has unused scoring categories
    WHEN the thirteenth category is submitted
    THEN the game SHALL be marked finished
    AND the completed score and final totals SHALL be displayed
    AND further rolls and score submissions SHALL be unavailable until a new game starts
```

**Verification:** [`TC-GAME-14`](../javascript/html5/test/game.test.js),
[`TC-UI-01`](../javascript/html5/test/main.test.js).

### FR-009 — Present current turn state and scoring choices

**Feature:** Game screen  
**Scenario:** Update the screen as the player progresses through a turn

```gherkin
FEATURE: Game screen
  SCENARIO: Update the screen as the player progresses through a turn
    GIVEN the game screen is displayed
    WHEN a turn has not yet been rolled
    THEN the start overlay SHALL be visible AND category selection SHALL be unavailable
    WHEN the player rolls
    THEN the roll count, turn guidance, dice controls, available category previews, and totals SHALL reflect current state
    AND each previously scored category SHALL be visibly scored and unavailable
    WHEN the third roll is complete
    THEN further rolling and die selection SHALL be disabled
    AND unused categories SHALL remain selectable
```

**Verification:** [`TC-UI-01`](../javascript/html5/test/main.test.js).

### FR-010 — Keep dice controls aligned with the scene

**Feature:** Dice selection  
**Scenario:** Select the die represented by each control

```gherkin
FEATURE: Dice selection
  SCENARIO: Select the die represented by each control
    GIVEN the dice scene provides projected positions for its five dice
    WHEN the scene layout changes or a die control is used
    THEN the controls SHALL use the current projected positions
    AND the selected logical die SHALL be held or released in the game state
    AND a held die SHALL be passed to the next scene roll as held
```

**Verification:** [`TC-UI-02`](../javascript/html5/test/main.test.js).

### FR-011 — Start or restart a game

**Feature:** Game restart  
**Scenario:** Reset game progress without resetting the mute preference

```gherkin
FEATURE: Game restart
  SCENARIO: Start a new game or play again
    GIVEN a game has any amount of progress
    WHEN the player activates New game or Play again
    THEN all categories, rolls, holds, turns, bonuses, and completion state SHALL reset
    AND the initial turn screen SHALL be displayed
    AND the sound mute preference SHALL be retained
```

**Verification:** [`TC-UI-01`](../javascript/html5/test/main.test.js).

### FR-012 — Toggle and play synthesized roll sound

**Feature:** Roll sound  
**Scenario:** Persist the mute preference and play audio when available

```gherkin
FEATURE: Roll sound
  SCENARIO: Toggle the mute preference and request roll audio
    GIVEN the player changes the sound setting
    WHEN the setting is toggled
    THEN the preference SHALL be persisted locally AND the control's accessible label SHALL update
    WHEN an unmuted roll is requested and Web Audio is available
    THEN synthesized roll noise and die impacts SHALL be scheduled
    AND a suspended audio context SHALL be resumed
    WHEN sound is muted or Web Audio is unavailable
    THEN no audio playback SHALL be required for the game to continue
```

**Verification:** [`TC-UI-01`](../javascript/html5/test/main.test.js),
[`TC-SOUND-01`](../javascript/html5/test/sound.test.js),
[`TC-SOUND-02`](../javascript/html5/test/sound.test.js).

### FR-013 — Toggle fullscreen

**Feature:** Fullscreen control  
**Scenario:** Enter and exit fullscreen where supported

```gherkin
FEATURE: Fullscreen control
  SCENARIO: Toggle fullscreen
    GIVEN the browser supports the Fullscreen API
    WHEN the player activates the fullscreen control
    THEN the application SHALL enter fullscreen if it is not already active
    AND it SHALL exit fullscreen if fullscreen is already active
    AND the control label SHALL reflect the current state
    WHEN the API rejects a request
    THEN the game SHALL remain usable AND the failure SHALL be reported
```

**Verification:** [`TC-UI-01`](../javascript/html5/test/main.test.js).

### FR-014 — Support keyboard shortcuts

**Feature:** Keyboard controls  
**Scenario:** Roll and toggle fullscreen without taking focus from buttons

```gherkin
FEATURE: Keyboard controls
  SCENARIO: Use the documented keyboard shortcuts
    GIVEN focus is outside a button
    WHEN the player presses Space
    THEN the roll action SHALL be invoked
    WHEN the player presses F
    THEN the fullscreen action SHALL be invoked
    WHEN focus is on a button
    THEN native button keyboard behavior SHALL remain available
```

**Verification:** [`TC-UI-01`](../javascript/html5/test/main.test.js).

### FR-015 — Render 3D dice or use numeric fallback

**Feature:** Dice presentation  
**Scenario:** Use WebGL rendering when possible and numeric controls otherwise

```gherkin
FEATURE: Dice presentation
  SCENARIO: Initialize the dice presentation
    GIVEN the application starts in a browser
    WHEN WebGL scene initialization succeeds
    THEN five dice SHALL be rendered and their values SHALL follow game state
    WHEN WebGL scene initialization fails
    THEN the screen SHALL show the numeric dice controls AND the game SHALL remain playable
```

**Verification:** The fallback is covered by
[`TC-UI-01`](../javascript/html5/test/main.test.js). Actual WebGL rendering is
**manual**: [`VT-WEBGL-01`](#6-verification-cases).

### FR-016 — Cache application assets for offline use

**Feature:** Offline operation  
**Scenario:** Install the worker and serve cached same-origin assets

```gherkin
FEATURE: Offline operation
  SCENARIO: Cache application assets for a later offline visit
    GIVEN the application is served from a supported secure context
    WHEN the service worker installs successfully
    THEN the application assets SHALL be precached
    AND same-origin GET requests SHALL be served from cache when a match exists
    AND successful network responses on cache misses SHALL be cached
    AND non-GET or cross-origin requests SHALL not be intercepted
    WHEN the application has not previously been cached
    THEN offline first-load availability SHALL NOT be guaranteed
```

**Verification:** **Manual** source and production deployment checks:
[`VT-OFFLINE-01`](#6-verification-cases). The service worker is excluded from
the current automated coverage configuration.

### FR-017 — Provide web app metadata

**Feature:** Browser app metadata  
**Scenario:** Load the application's manifest and icon assets

```gherkin
FEATURE: Browser app metadata
  SCENARIO: Resolve the declared app metadata
    GIVEN the application document is loaded
    WHEN the browser reads its web app manifest
    THEN the manifest SHALL provide the declared app identity, launch scope, display preference, theme colors, and icon
    AND the referenced icon SHALL resolve from the application deployment
```

**Basis:** Manifest integration in [`index.html`](../javascript/html5/src/index.html)
and app metadata in
[`manifest.webmanifest`](../javascript/html5/src/manifest.webmanifest) and
[`dice-icon.svg`](../javascript/html5/src/img/dice-icon.svg).
**Verification:** **Manual** manifest and icon check
[`VT-MANIFEST-01`](#6-verification-cases).

## 4. Non-functional requirements

### NFR-001 — Direct source hosting

**Feature:** Static deployment  
**Scenario:** Serve the source tree without a build tool

```gherkin
FEATURE: Static deployment
  SCENARIO: Serve the unbundled source application
    GIVEN a static HTTP server serves `javascript/html5/src` as its web root
    WHEN a compatible browser requests the application
    THEN the application SHALL load using relative browser-resolvable modules and assets
    AND no Vite server, build step, or installed runtime npm dependency SHALL be required
```

**Basis:** Explicit non-functional constraint in [`README.md`](../README.md)
and [`software_architecture.md`](software_architecture.md).
**Verification:** **Manual** [`VT-SOURCE-01`](#6-verification-cases).

### NFR-002 — Static production deployment and subdirectory support

**Feature:** Production deployment  
**Scenario:** Build and serve the application from a static host

```gherkin
FEATURE: Production deployment
  SCENARIO: Serve the production build at a relative path
    GIVEN the production build has completed
    WHEN the contents of `javascript/html5/dist` are served by a static HTTP host
    THEN the application SHALL load without an application server or database
    AND relative asset references SHALL support hosting at the host root or a subdirectory
```

**Basis:** [`README.md`](../README.md) and
[`vite.config.js`](../javascript/html5/vite.config.js).
**Verification:** Build command `npm run build`; **manual** hosted check
[`VT-BUILD-01`](#6-verification-cases).

### NFR-003 — Browser-only single-player architecture

**Feature:** Client-side execution  
**Scenario:** Play without a game backend

```gherkin
FEATURE: Client-side execution
  SCENARIO: Play a complete game in the browser
    GIVEN the browser has loaded the static application assets
    WHEN the player completes a game
    THEN game state, scoring, rendering, and audio SHALL execute on the client
    AND no server-side game state, account, database, or multiplayer service SHALL be required
```

**Basis:** [`README.md`](../README.md) and
[`software_architecture.md`](software_architecture.md). Verification is
**manual** architectural inspection [`VT-ARCH-01`](#6-verification-cases);
no network-service test exists.

### NFR-004 — Accessible interaction and status

**Feature:** Accessible interface  
**Scenario:** Operate and understand the game with semantic controls

```gherkin
FEATURE: Accessible interface
  SCENARIO: Operate the game using accessible controls
    GIVEN the player navigates the application
    WHEN game actions or state changes are presented
    THEN actionable controls SHALL be semantic buttons with meaningful accessible names
    AND held dice SHALL expose their pressed state
    AND roll and turn status changes SHALL be announced through live regions
    AND keyboard focus SHALL be visibly indicated
```

**Basis:** Accessible landmarks, labels, live regions, and focus styling in
[`index.html`](../javascript/html5/src/index.html) and
[`styles.css`](../javascript/html5/src/css/styles.css); controller behavior in
[`main.js`](../javascript/html5/src/main.js).
**Verification:** Partial automated coverage in
[`TC-UI-01`](../javascript/html5/test/main.test.js); **manual**
keyboard/screen-reader review [`VT-A11Y-01`](#6-verification-cases).

### NFR-005 — Responsive layout and interaction alignment

**Feature:** Responsive presentation  
**Scenario:** Keep the game usable as the viewport changes

```gherkin
FEATURE: Responsive presentation
  SCENARIO: Adapt the game layout to the available viewport
    GIVEN the game is displayed at supported desktop or narrow mobile widths
    WHEN the viewport or dice stage is resized
    THEN the game and scorecard layout SHALL adapt to the available space
    AND die selection controls SHALL remain aligned to the corresponding rendered dice
```

**Basis:** Responsive CSS and resize-aware scene layout in
[`styles.css`](../javascript/html5/src/css/styles.css) and
[`dice-scene.js`](../javascript/html5/src/dice-scene.js).
**Verification:** Layout event and projected positions are covered by
[`TC-UI-02`](../javascript/html5/test/main.test.js); **manual**
cross-width check [`VT-RESP-01`](#6-verification-cases).

### NFR-006 — Degrade gracefully when optional browser APIs are unavailable

**Feature:** Browser capability resilience  
**Scenario:** Preserve core play when an enhancement is unavailable

```gherkin
FEATURE: Browser capability resilience
  SCENARIO: Continue play without optional browser capabilities
    GIVEN WebGL, Web Audio, fullscreen, or service worker support is absent or unavailable
    WHEN the corresponding feature is initialized or requested
    THEN failure of that optional capability SHALL NOT prevent core game play
    AND available controls SHALL continue to report their actual state
```

**Basis:** Numeric dice fallback, optional audio, and logged fullscreen/worker
failures in [`main.js`](../javascript/html5/src/main.js),
[`dice-scene.js`](../javascript/html5/src/dice-scene.js), and
[`sound.js`](../javascript/html5/src/sound.js).
**Verification:** [`TC-UI-01`](../javascript/html5/test/main.test.js),
[`TC-SOUND-01`](../javascript/html5/test/sound.test.js), and
[`TC-SOUND-02`](../javascript/html5/test/sound.test.js); worker and actual
WebGL cases are manual (`VT-WEBGL-01`, `VT-OFFLINE-01`).

### NFR-007 — Preserve module boundaries and deterministic testability

**Feature:** Maintainable and testable rules  
**Scenario:** Verify game rules independently of browser presentation

```gherkin
FEATURE: Maintainable and testable rules
  SCENARIO: Exercise state transitions and scoring independently
    GIVEN the rules module is tested
    WHEN tests provide game state and a deterministic random source
    THEN rule behavior SHALL be verifiable without DOM, graphics, or audio dependencies
    AND automated coverage SHALL meet the configured 96 percent threshold for branches, functions, lines, and statements
```

**Basis:** Rule/presentation separation and injected randomness in
[`game.js`](../javascript/html5/src/game.js); coverage configuration in
[`vitest.config.js`](../javascript/html5/vitest.config.js).
**Verification:** [`TC-GAME-01`](../javascript/html5/test/game.test.js) through
[`TC-GAME-14`](../javascript/html5/test/game.test.js); run `npm run coverage`
from `javascript/html5`.

### NFR-008 — Release graphics resources when the page unloads

**Feature:** Graphics lifecycle  
**Scenario:** Dispose the scene during page teardown

```gherkin
FEATURE: Graphics lifecycle
  SCENARIO: Release scene resources on page unload
    GIVEN a dice scene has been initialized
    WHEN the page is about to unload
    THEN the scene SHALL stop its animation work, disconnect its resize observer, and dispose owned graphics resources
```

**Basis:** Scene disposal described in
[`software_architecture.md`](software_architecture.md) and invoked by
[`main.js`](../javascript/html5/src/main.js).
**Verification:** The controller invokes disposal in
[`TC-UI-02`](../javascript/html5/test/main.test.js); actual resource release is
**manual** [`VT-WEBGL-01`](#6-verification-cases).

### NFR-009 — Lint repository Markdown files

**Feature:** Documentation quality  
**Scenario:** Run markdownlint across repository Markdown files

```gherkin
FEATURE: Documentation quality
  SCENARIO: Lint all repository Markdown files
    GIVEN the repository contains Markdown files
    WHEN the Markdown lint check is run
    THEN markdownlint SHALL check every repository `*.md` file
    AND the check SHALL report no lint errors
```

**Basis:** Documentation consistency requirement. The current project scripts
do not configure or invoke markdownlint; this requirement is not yet
implemented.
**Verification:** Pending implementation. Acceptance check
[`VT-MD-01`](#6-verification-cases).

## 5. Automated test-case traceability

Each listed test case ID is present in the corresponding test function title.
The function title also contains its linked requirement IDs and Gherkin
`GIVEN` / `WHEN` / `THEN` clauses.

| Test case | Requirement IDs | Test source and test purpose |
| --- | --- | --- |
| TC-GAME-01 | FR-001, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — initial state |
| TC-GAME-02 | FR-002, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — first roll and held-die reroll |
| TC-GAME-03 | FR-002, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — all-held roll and three-roll limit |
| TC-GAME-04 | FR-003, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — random source and sample validation |
| TC-GAME-05 | FR-002, FR-003, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — hold timing and index validation |
| TC-GAME-06 | FR-004, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — upper-category scoring |
| TC-GAME-07 | FR-004, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — kind, house, Five of a Kind, and Chance scoring |
| TC-GAME-08 | FR-004, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — straight scoring |
| TC-GAME-09 | FR-003, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — malformed roll and unknown-category validation |
| TC-GAME-10 | FR-003, FR-005, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — submission preconditions |
| TC-GAME-11 | FR-005, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — score commit and turn reset |
| TC-GAME-12 | FR-006, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — repeat bonus eligibility |
| TC-GAME-13 | FR-007, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — upper bonus and aggregate totals |
| TC-GAME-14 | FR-008, NFR-007 | [`game.test.js`](../javascript/html5/test/game.test.js) — thirteen-category completion |
| TC-UI-01 | FR-005–FR-009, FR-011–FR-015, NFR-004, NFR-006 | [`main.test.js`](../javascript/html5/test/main.test.js) — screen workflow, scoring, utilities, fallback, and completion |
| TC-UI-02 | FR-010, NFR-005, NFR-008 | [`main.test.js`](../javascript/html5/test/main.test.js) — projected control layout, held dice, and scene disposal |
| TC-SOUND-01 | FR-012, NFR-006 | [`sound.test.js`](../javascript/html5/test/sound.test.js) — muted and unavailable-audio behavior |
| TC-SOUND-02 | FR-012 | [`sound.test.js`](../javascript/html5/test/sound.test.js) — synthesized roll and impact scheduling |

The existing integration tests combine several screen behaviors in one test
function; FR-009 through FR-015 therefore share TC-UI-01 rather than claiming
independent automated test functions.

## 6. Verification cases

These are recommended acceptance checks for requirements that are not
established by jsdom or mocked browser APIs. They are references, not claims
that these checks have already been executed.

| Verification case | Type | Requirement IDs | Acceptance check |
| --- | --- | --- | --- |
| VT-SOURCE-01 | Manual | NFR-001 | Serve `javascript/html5/src` directly over HTTP without Vite or a build; load the game and complete a turn. |
| VT-BUILD-01 | Build + manual | NFR-002 | Run `npm run build`; serve `dist` from a root path and a subdirectory; verify assets, manifest icon, and worker resolve. |
| VT-WEBGL-01 | Manual | FR-015, NFR-006, NFR-008 | Test with WebGL enabled and unavailable; verify values, interaction, fallback, resize alignment, and cleanup at page unload. |
| VT-OFFLINE-01 | Manual | FR-016, NFR-006 | On HTTPS or localhost, install the worker online, reload with the network disabled, and verify cached same-origin assets work; separately verify first-load offline is not expected. |
| VT-MANIFEST-01 | Manual | FR-017 | Verify that the document's manifest reference resolves and that the manifest's icon URL resolves from both direct-source and production deployments. |
| VT-A11Y-01 | Manual | NFR-004 | Navigate with keyboard and a screen reader; verify control names, held state, live announcements, and visible focus. |
| VT-RESP-01 | Manual | NFR-005 | Check narrow mobile and desktop widths; verify usable layout and that dice controls track their corresponding dice after resizing. |
| VT-ARCH-01 | Manual | NFR-003 | Inspect runtime requests and application architecture to confirm game state and rules are client-side and no backend service is required. |
| VT-MD-01 | Automated | NFR-009 | Configure and run markdownlint over every repository Markdown file (`*.md`); verify the command exits successfully with no lint errors. |

## 7. Traceability maintenance

- Keep requirement IDs stable; add IDs for new requirements rather than
  recycling IDs whose behavior changes.
- Add the applicable requirement ID and a Gherkin-form test title to every new
  test function in an implemented test source.
- Update the relevant requirement's verification link and the traceability
  table whenever tests are added, removed, or split.
- Keep manual verification explicitly labeled until it is automated and run.
- Add the Markdown lint command and configuration to project tooling when
  implementing NFR-009; ensure its file selection covers repository Markdown
  files and does not silently omit documentation.
- Change this document when the implementation, scoring rules, architecture,
  or deployment constraints change; do not treat undocumented behavior as a
  requirement.
