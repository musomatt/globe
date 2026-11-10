# Local manual review

Reviewed on 8–9 November 2026. No automated tests were added.

## Current scene: ambient globe, 9 November

Removed the simulated-user fixture, both activity renderers, activity bloom, style selection, and activity counter from the running application. The previous prototype sources and fixture are archived under `experiments/active-users/`, preserving the earlier work without importing or shipping it. The recorded activity reviews below describe historical versions.

The production preview at `/`, `?style=columns`, and `?style=halos` now opens with only the Earth, decorative stars and satellites, and fullscreen button. Visual inspection confirmed that the columns, halos, and count are gone. No browser warnings or errors were reported. A source and production-bundle search found no activity imports, fake-user IDs, or count markup. Formatting, lint, TypeScript, and production build passed.

## Environment

- Codex in-app desktop browser, using WebGL 2 through ANGLE / Metal on Apple M2.
- Maximum reported texture size: 16384.
- Normal preview viewport, 1920 × 1080, and 3840 × 2160 viewport framing inspected.
- A 4K viewport used an internal rendering size of 2981 × 1677, respecting the five-million-pixel budget. This is viewport emulation, not a physical TV review.

## Observed behaviour

- All Earth assets load from the local server. The current scene opens with only the subtle fullscreen button, without page scrolling or shader errors.
- The Earth has a cool charcoal material with a restrained blue tint, detailed terrain relief, a soft atmospheric edge, and a rich background starfield. Small near-globe lights remain visually subordinate.
- Mouse dragging changes the viewpoint smoothly. Wheel zoom moves in to detailed terrain and back out while the Earth remains centred.
- Idle rotation resumes after interaction. The globe changes orientation over time while the distant stars remain independent of the Earth's axial rotation.
- Resizing between the preview, 1080p, and 4K viewports preserves the spherical proportions and viewport coverage.
- Temporarily removing the day texture and reloading showed the expected concise failure message. Restoring the asset recovered the scene.
- Reduced-motion behaviour was manually exercised by temporarily making the media query always match, then restoring the real `prefers-reduced-motion` query. This checks the application's still-scene branch without changing the user's system preferences.
- Before the particle-density increase, two consecutive 30-second development samples at 1920 × 1080 reported 60 fps, four draw calls, three textures, and three geometries. Resource counts remained constant across those samples.
- The production build was served separately with `npm run preview`, rendered successfully, and produced no new browser errors. The [saved preview](preview.jpg) shows that build.
- The bottom-right fullscreen button was clicked in the production preview. It disappeared on entering fullscreen. Pressing Escape returned to browser view and restored the button, with no console errors. An explicit Escape handler supplements native browser behaviour for embedded browsers.
- Star and satellite counts were increased from 2,600 / 14 to 7,800 / 42. The production preview was visually reviewed at the normal browser size and 1920 × 1080, with no browser warnings or errors. The saved preview reflects this denser scene; frame-rate sampling was not repeated for this change.
- Surface banding was reviewed over South America at 1920 × 1080, including close zoom. A temporary stationary view and disabled-relief comparison isolated the terrain shading contribution. The final shader uses a smooth spherical tangent frame, gently filtered normal samples, and sub-level output dithering. The [South America review image](banding-review.jpg) records the smoothed shading during that comparison. Normal rotation, relief strength, and the original starting view were restored afterward. The final build renders without browser errors; frame-rate sampling was not repeated for this change.

The latest palette adjustment reduces the surface's saturation and brightness and softens the atmospheric blue. The space shader is unchanged. The production preview was visually checked for terrain readability and colour balance, with no browser errors.

## Cumulative visual refinements

Each layer was added separately, built, and captured in the [refinement gallery](refinements/README.md):

1. A thinner atmospheric crescent concentrated around the illuminated limb.
2. A faint cloud shell with independent drift and subtle surface shadows, using a locally served 2K cloud texture.
3. Fine variation in ocean reflection roughness, photographed from a Pacific-facing view to make the water visible. The original opening orientation was restored afterward.
4. Satellite fading through the Earth's shadow and occasional soft glints, with the existing particle counts and travel speeds retained.

The combined scene rendered without browser warnings or errors. Four consecutive 30-second development samples on Apple M2 reported 60 fps, five draw calls, four textures, and three geometries at an internal resolution of 1672 × 1558. Resource counts stayed constant. This is a normal-preview measurement; the new layers were not separately benchmarked at 4K.

The new animated layers share the existing paused/reduced-motion animation clock. That integration was inspected in source; the reduced-motion branch was not manually re-exercised after these additions.

### Horizon haze

A subsequent surface-shader refinement adds faint haze along the illuminated horizon. Its strength follows the viewing path through a thin air layer, using the smooth sphere normal and existing light direction. It reduces distant terrain contrast before the atmospheric rim is added, with the existing colour grading and output dithering retained. It adds no textures or draw calls.

The [before/after images](refinements/README.md#5-horizon-haze) use an identical stationary scene and normal exposure, both at full-globe framing and a closer horizon view. Rotation and zoom were manually checked in the running development scene; the haze remained smooth across the light-to-shadow transition. The production preview also rendered without browser warnings or errors. Lint, formatting, TypeScript, and the production build passed. Frame-rate sampling was not repeated for this small shader change.

### Ocean reflections at shallow angles

The water shader now uses Fresnel-style angular reflectance for a fine glint and a broad, gently textured sheen. The broad reflection follows the light direction, is restricted by the water mask, and fades on the shadowed side. Cloud shadows attenuate both components. The existing horizon haze and colour grading remain in place. This is an artistic reflection approximation, not an environment-map or wave simulation, and requires no extra textures or draw calls.

The [ocean comparison](refinements/README.md#6-angle-dependent-ocean-reflections) shows identical stationary Pacific close-ups before and after, with all visual layers enabled. Normal-exposure images are accompanied by a pair rendered at two stops higher exposure for small-screen inspection; the application's exposure remains 1.05. The full composition and an oblique view reached by dragging and zooming were checked manually, with dark water preserved away from the light.

One subsequent 30-second development sample on Apple M2 reported 60 fps, five draw calls, four textures, and three geometries at 1672 × 1558 internal resolution. The production build rendered without browser warnings or errors. Lint, formatting, TypeScript, and the build passed. The temporary capture page was removed.

## Simulated active-user prototype

The first data layer contains 200 fictional active users across 94 city regions. The fixture was manually inspected with a one-off script: 200 records, 200 unique IDs, 200 active flags, 200 valid latitude/longitude pairs, and all 200 positions on land according to the application's 8K water mask. The largest city cluster contains five users. No automated tests were added.

Each user has a geographic base, a short radial stem, and a bright tip. The markers inherit the Earth's world transform and are composited above clouds. A matching opaque sphere and a gradual facing fade hide far-side activity. Visual review covered the initial Europe/Africa view and the Americas as rotation continued; markers stayed attached to land and disappeared at the horizon. The glow was reduced from the initial trial to keep crowded regions legible.

Activity uses a separate half-float bloom pass with tone mapping, then additive composition over the original scene. The original surface/background shader output and dithering remain on their existing rendering path. The full frame now uses 23 draw calls, 17 textures, and seven geometries. A 30-second development sample at 1672 × 1558 reported 60 fps; two further samples during 1920 × 1080 capture also reported 60 fps with stable resource counts and all 200 users. No browser or shader errors were observed.

The [rotation video](previews/active-users-slow-rotation.mp4) was captured from the WebGL canvas and converted to H.264 MP4: 1920 × 1080, 30 fps, 1,799 frames, 59.97 seconds, approximately 12.5 MB. It preserves the 280-second revolution speed; it is a one-minute excerpt rather than a complete revolution. It has no audio or DOM interface. Internal HDR glow is tone-mapped to an SDR video. Playback was checked in the local browser, which reported no video error; opening and late frames were also inspected. The [poster](previews/active-users-poster.jpg) is extracted from the recording.

The development-only capture module is absent from the production JavaScript. The production preview was checked after restoring the normal viewport, including dragging and zooming; geography and the glow overlay remained aligned, with no browser warnings or errors. Lint, formatting, TypeScript, and the production build passed. The wider checks listed below, including physical-TV and long-duration reviews, remain outstanding.

## Slower upward flow and city density

The fixture is unchanged: 200 users across 94 cities, with one to five users per city. All 200 base points remain; the 94 broader city columns replace overlapping individual stems. Heights now increase monotonically with the city's simulated active-user count: 0.055, 0.1, 0.145, 0.19, and 0.235 Earth radii. Widths increase from 0.016 to 0.024 Earth radii. The columns use camera-facing mesh ribbons so width does not depend on browser support for wide WebGL lines.

Base and tip lights no longer breathe. A broad highlight travels upward in approximately 11 seconds, on staggered 26-second cycles, with its wrap outside the visible column. The existing reduced-motion clock controls this shader too. Visual review confirmed the thicker, softly edged columns, distinct heights, and steady tips. A development sample during 1920 × 1080 capture reported 60 fps with the same 23 draw calls, 17 textures, and seven geometries; no shader or browser errors were reported.

The updated [rotation video](previews/active-users-upward-flow.mp4) and [still](previews/active-users-upward-flow.jpg) show the revised motion and proportions. The MP4 is 1920 × 1080, H.264, 30 fps, 1,800 frames, 60 seconds, and approximately 9.9 MB. Browser playback advanced normally with no video error. The earlier thin-beacon preview remains available for comparison. Production dragging and zooming were checked with no browser warnings or errors; columns stayed attached and retained their width and softness. Lint, formatting, TypeScript, and the production build passed.

## Alternative surface-halo style

The original column renderer (`src/scene/active-users.ts`) and the JSON data fixture are byte-for-byte unchanged, verified with SHA-256 before and after the new implementation. The shared application selects columns with `?style=columns`; `?style=halos` uses a separate renderer. Both URLs were checked in the local browser, showed 200 active users, and rendered without shader or browser errors. After user review, the tall columns were restored as the default; the halo experiment remains opt-in.

A one-off fixture inspection confirmed 200 unique active records, 94 city groups, and 200 orbiting lights when the city counts are summed. Each halo is centred on its city's mean geographic direction. Its tangent radius scales with the square root of count, so the approximate halo area encodes count. One to five lights orbit each city over 58–74 seconds; these are a presence treatment rather than actual movement. No automated tests were added.

The new technique uses instanced, subdivided surface patches with procedural filaments, lights, trails, and glow. It shares the existing bloom compositor but does not alter the globe or column shaders. Visual review included the initial Europe/Africa composition, an oblique Atlantic view reached by dragging and zooming, and the Americas during rotation. The patches stay attached to the sphere and fade at the horizon. Filtering conserves filament and light energy to avoid bright smears when viewed edge-on. The existing reduced-motion clock freezes local orbit motion; an OS preference change was not manually exercised.

Multiple 30-second development samples at 1920 × 1080 reported 60 fps, 21 draw calls, 17 textures, and five geometries, with no shader or browser errors. The columns use 23 draw calls and seven geometries. Production preview, lint, formatting, TypeScript, and build passed.

The [halo video](previews/active-users-halos.mp4) and [still](previews/active-users-halos.jpg) are separate artifacts; all earlier column previews are retained. The new MP4 is H.264, 1920 × 1080, 30 fps, 1,801 frames, 60.03 seconds, and approximately 10.8 MB. It uses the unchanged 280-second globe revolution and original exposure. The still is extracted from the video at three seconds. Browser playback advanced normally with no video error, and the production halo view was restored afterward.

## Current build checks

`npm run check` runs Biome formatting/lint checks and TypeScript checking. Biome completed in about 0.1 seconds on the latest reviewed source. `npm run build` produces the static application in `dist/`.

The ambient Three.js application bundle is about 574 kB uncompressed / 144 kB gzip. Vite reports its default 500 kB chunk advisory; this is the renderer needed by the scene, not a failing build. Locally served Earth assets total about 12 MB, including the 943 kB cloud image. Archived data visualisations and review videos are not shipped in the application build.

## Limits of this review

- No physical TV or second desktop browser was reviewed.
- A continuous 30-minute viewing session is still outstanding; the shorter rendering samples above do not establish long-duration stability.
- Graphics-context restoration and an actual operating-system reduced-motion preference change are implemented but were not manually triggered in the browser.
- CI is configured for `ubuntu-latest` but was not run remotely, in keeping with the local-only request.
