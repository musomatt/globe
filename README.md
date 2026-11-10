# Globe

A quiet, charcoal Earth with a restrained blue tint suspended in space. A full-viewport Three.js scene with detailed terrain, a directional atmospheric crescent, faint drifting clouds, a rich star field, and subtle satellite-like lights. Made for a desktop browser and ambient viewing on a large display.

The current scene is ambient artwork only: no simulated users, location markers, columns, halos, or data counters.

Drag to rotate. Scroll to zoom. Gentle rotation resumes after five seconds without interaction. The cursor fades from view while idle. A subtle button in the bottom-right corner enters fullscreen and disappears while fullscreen is active. Press Escape to return to the browser and restore the button.

## Run locally

Use Node.js 24 (or Node.js 22.12+) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use the bottom-right fullscreen button for an uninterrupted display.

```sh
npm run check    # Biome lint/format checks and TypeScript
npm run build    # Production bundle in dist/
npm run preview  # Serve the production build locally
npm run format   # Apply formatting and safe lint fixes
```

CI uses `ubuntu-latest` and runs the same checks and build. Verification is manual; this prototype contains no automated tests. Work in this session stays local, as requested.

## Scene

- `src/config.ts`: framing, motion, shared light direction, particle counts, and rendering budget.
- `src/scene/earth.ts` and its GLSL shaders: 8K surface/normal/water maps, cool charcoal material treatment, relief lighting, directional atmosphere, faint horizon haze and cloud shadows, and ocean reflections with fine roughness variation and a sheen that strengthens at shallow viewing angles.
- `src/scene/space.ts`: a subtly dithered deep-space background.
- `src/scene/particles.ts`: seeded stars and decorative orbiting points, rendered in one draw call with depth occlusion, Earth-shadow fading, and soft satellite glints.
- `src/main.ts`: camera interaction, loading, resource cleanup, reduced motion, visibility handling, and adaptive rendering resolution.

The scene respects `prefers-reduced-motion`, pauses rendering while the tab is hidden, and handles graphics-context restoration. Desktop WebGL 2 and hardware acceleration are required. Internal resolution is capped at five million pixels and may reduce after sustained slow frames; a 4K viewport does not necessarily render at native 4K resolution.

In development, the console prints a compact rendering sample every 30 visible seconds: frame rate, draw calls, resource counts, and internal resolution. These diagnostics are removed from production builds.

## Recording a preview

With `npm run dev` running, open `/?record` in a desktop browser supporting WebM recording. It captures 60 seconds from the canvas at 30 fps and offers a download link. The recording uses a pixel ratio of one, so a 1920 × 1080 browser viewport produces a 1080p video. Keep the page visible during capture. This development-only mode is excluded from the production bundle; the video contains the artwork without the fullscreen button.

The normal rotation speed is one revolution every 280 seconds. The clip is an excerpt at that speed, not an accelerated full revolution. The exported video uses standard dynamic range after tone mapping.

The previous data visualisations are [archived](experiments/active-users/README.md) outside the application, alongside their historical [preview recordings](docs/previews/README.md). They are not loaded or shipped.

## Assets and direction

Earth textures are by [Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/), used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). They are served locally; no external service is required at runtime. Full sources and conversion details are in [texture credits](public/textures/ATTRIBUTION.md), which are also included in the production build.

The [specification](docs/specification/setup.md) records the art direction and manual acceptance criteria. The supplied [inspiration](docs/inspiration/) informed the lighting and atmosphere and is not shipped in the app.

The [refinement gallery](docs/refinements/README.md) shows each cumulative visual layer: atmosphere, clouds, ocean reflections, satellite lighting, and horizon haze.
