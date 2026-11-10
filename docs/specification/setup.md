# Globe — specification

Status: implemented locally; visual direction and acceptance criteria recorded below.
Updated: 9 November 2026.

## Purpose

Create a beautifully rendered Earth in space using Three.js. The scene fills the browser viewport and should be compelling enough to leave running on a television as ambient artwork.

The globe has a cool charcoal palette with a restrained blue tint, detailed terrain, atmospheric lighting, and subtle particles suggesting distant stars and satellites. The mood comes from the supplied [GMUNK inspiration images](../inspiration/): cinematic, spacious, luminous, and calm.

The scene is ambient artwork only. It opens directly into the globe and needs no input to be enjoyed. The simulated-user data, luminous columns, halo experiment, and activity count have been removed from the application. The bottom-right fullscreen button disappears in fullscreen.

This document began as a specification-only phase. The user has since requested implementation, with all work kept local and nothing pushed to a remote.

## Confirmed scope

| Area | Decision |
| --- | --- |
| Rendering | Three.js. |
| Primary environment | Desktop browser. |
| Presentation | Viewport-filling globe and a subtle fullscreen button that hides in fullscreen. |
| Art direction | Dark, textured charcoal Earth with a subdued blue tint and soft cool highlights, blending into the existing space background. |
| Interaction | Drag to rotate, zoom, and gentle rotation when idle. |
| Particles | Subtle decorative stars and satellite-like points of light. |
| Data | No data overlays, fake activity, live feed, or tracking. |
| Quality goal | A scene beautiful and calm enough to display on a TV for extended periods. |
| Verification | Manual only; no automated tests. |

Drag and zoom operate directly on the scene. The only interactive control is the bottom-right fullscreen button. The browser's native Escape behaviour exits fullscreen, and the button reappears in browser view.

Dashboard functionality is outside this specification.

## Reference interpretation

The supplied images establish the look, material detail, and lighting. They are still images, so the motion behaviour below is a proposed design rather than an observation of the original project.

| Reference | Direction to carry forward |
| --- | --- |
| [01_COLLABORATION_OPEN_PR_01.jpg](../inspiration/01_COLLABORATION_OPEN_PR_01.jpg) | Dark Earth, readable terrain, deep navy space, and cool luminous accents. |
| [04_COLLABORATION_FUCK_ALL.jpg](../inspiration/04_COLLABORATION_FUCK_ALL.jpg) | The balance of blue/violet illumination against a dark planetary surface. |
| [Collaboration_006.jpg](../inspiration/Collaboration_006.jpg) | Restrained violet shading and separation of the spherical silhouette from the background. |
| [DSC06911.jpg](../inspiration/DSC06911.jpg) | Close-up surface relief, blue lighting, and the impression of a substantial three-dimensional object. |
| [DSC07721.jpg](../inspiration/DSC07721.jpg) | Presence and readability at room-viewing distance on a large display. |

The reference dashboards, data markers, luminous columns, and connection arcs remain excluded. The composition stays centred on the globe.

## Art direction

### Composition

- Use one central Earth as the clear focal point, surrounded by generous dark space.
- Fill the viewport without page margins, scrollbars, panels, or document content around the canvas.
- Keep the entire globe and its atmospheric edge visible in the initial composition.
- Begin with a globe diameter around 75–80% of the viewport's shorter dimension. Treat this as a tuning default, to be judged in the browser.
- Use a slightly tilted axis and a flattering initial view of Europe, Africa, and western Asia, drawing on the references. The starting view is an artistic default, not a geographic feature.
- Preserve the spherical proportions and balanced framing when the window is resized, including wide desktop and television aspect ratios.

The scene fills the browser viewport by default. A subtle bottom-right button requests native fullscreen on click, then hides until fullscreen ends. Escape returns to browser view. The button is keyboard-accessible and is omitted when the browser cannot support fullscreen. A dedicated TV application, kiosk system, and mobile-specific experience are outside the first version.

### Earth surface

- Render a solid, recognisable Earth with coherent coastlines, landforms, oceans, and terrain relief.
- Build the palette around cool charcoal and near-black, with a subdued blue tint. Keep the atmospheric edge softly cool and preserve the existing space background colour.
- Let terrain detail emerge through lighting and surface texture. Continents should remain legible from a comfortable viewing distance.
- Keep oceans darker and smoother than land, with restrained reflections and no plastic or mirror-like finish.
- Break up ocean highlights with fine, slowly changing roughness variation. Fade fine detail at a distance to avoid shimmer and banding.
- Strengthen water reflections gradually at shallow viewing angles. Keep the broad sheen aligned with the existing light, subdued in shadow, and softened by cloud cover; retain the dark ocean colour when viewed head-on.
- Preserve rich shadows while retaining enough detail to read the sphere. Avoid crushing the entire unlit side into an indistinguishable black disc.
- Keep the geographic silhouette natural. Political borders, grids, labels, and city markers are outside the visual treatment.

### Lighting and atmosphere

- Use a stable, soft directional light to reveal relief and establish a clear light-to-shadow transition.
- Add enough cool fill to retain shape in the shadowed hemisphere.
- Place a delicate atmospheric glow around the limb, strongest near the lit edge and fading smoothly into space.
- Shape the glow into a thin directional crescent, with very little light around the shadowed edge.
- Gradually soften surface contrast toward the illuminated horizon with a faint, desaturated haze. Keep the central terrain sharp and the shadowed hemisphere dark, without a visible boundary to the effect.
- Add barely visible clouds on a shell just above the surface, drifting independently and casting faint shadows in the shared light direction. Keep terrain readable beneath them.
- Apply glow selectively and gently. Fine detail and the globe's outline must remain crisp beneath it.
- Avoid a broad opaque halo, obvious concentric shells, blown-out highlights, or abrupt colour bands.
- Keep the palette consistent as the Earth rotates. A real-time solar position or day/night simulation is unnecessary.

### Data overlays

No simulated users, location markers, columns, or halos are rendered. The previous experiments are archived outside the application source and production bundle. Old `style` query parameters have no effect.

### Space and particles

- Use a near-black/navy background with subtle depth and tonal variation.
- Distribute a sparse star field with varied size and brightness. Most stars should be faint, with only occasional brighter points.
- Keep the distant stars independent of the Earth's axial rotation so the environment feels like space around the planet.
- Introduce a small number of satellite-like glints moving slowly near the globe. These are decorative points of light with no associated information or real orbital data.
- Hide satellite particles correctly when they pass behind the Earth. Any visible near-side passage must remain subtle enough to preserve the surface as the focus.
- Fade satellites smoothly as they enter the Earth's shadow. Use occasional soft reflections tied to the light and viewing direction, without flashing or increasing their travel speed.
- Begin with points of light alone. Consider very short, faint trails only if they improve the composition during manual review.
- Keep stars and satellites visually subordinate to the Earth; use neither continuous orbit rings nor location-to-location arcs.
- Avoid rapid flashing, meteor showers, busy particle clouds, and dense effects covering the surface.

## Motion and direct interaction

The scene should remain enjoyable when left untouched. Movement is slow and continuous, with no recurring dramatic sequence or camera tour.

| Behaviour | Specification |
| --- | --- |
| Idle motion | Slow axial rotation. Start by tuning one revolution over roughly three to five minutes; visual review determines the final speed. |
| Drag | Rotate smoothly with mouse or trackpad dragging. Suspend idle rotation while interacting and apply restrained damping on release. |
| Zoom | Support wheel/trackpad zoom with smooth, bounded motion. Keep the camera outside the surface and atmosphere, and prevent zooming so far out that the globe disappears. |
| Idle resume | Resume rotation gently after a short period without interaction; begin tuning with five seconds. Preserve the chosen orientation and zoom rather than snapping to the opening view. |
| Camera | Keep the Earth centred. Disable free panning and avoid uncontrolled rolling or abrupt flips. |
| Selection | Clicking a location or particle has no information or navigation behaviour. |
| Reduced motion | Respect the system preference by stopping automatic rotation, particle travel, cloud drift, and animated reflection variation; keep the composed scene and direct manipulation available. |
| Background tab | Suspend unnecessary rendering while hidden and resume without jumping forward through accumulated animation time. |

Initial scale, tilt, rotation speed, damping, zoom bounds, particle density, and glow intensity are internal tuning values. There is no settings panel or user-facing quality selector.

## Presentation and loading

- Open directly into the artwork with the subtle fullscreen button. There is no navigation, logo, onboarding, or statistics panel.
- Use the final background colour from the first frame so loading never flashes a white page.
- Reveal the composed scene once its essential surface and lighting assets are ready. A brief, subtle fade is acceptable; honour reduced motion.
- Avoid showing an untextured placeholder Earth, broken textures, or partially assembled lighting.
- Keep the experience silent; audio is outside scope.
- If essential assets or graphics support fail, provide a concise failure message instead of leaving an unexplained blank screen. This is an exceptional failure state, not part of the normal artwork.

## Technical direction for implementation

Use a minimal browser application with Three.js responsible for the scene, camera, materials, lighting, particles, and rendering. The confirmed scope requires no application framework, server-side application, database, authentication, or external data service.

Separate the Earth surface, atmosphere, distant stars, and near-globe particles so their appearance and motion can be tuned independently. Keep camera interaction and rendering quality configuration separate from the visual layers. Prefer a small, understandable scene over a general-purpose globe/dashboard framework.

Use elapsed time for animation so motion remains consistent across refresh rates. Bound particle counts and reuse rendering resources so the experience can remain open for long viewing sessions. Handle resizing and release allocated resources when the scene is disposed.

Select Earth surface and relief assets that support close inspection and the cool charcoal material treatment. Record their source, licence, and attribution requirements in project documentation. Bundle or serve approved assets with the application rather than depending on third-party image hotlinks. The inspiration images guide art direction; they are not runtime textures.

The local implementation uses TypeScript, Vite, npm, Three.js with WebGL 2, and locally served Solar System Scope textures. Versions are pinned in the package manifest and lockfile. No hosting destination has been selected; deployment is outside the current request.

## Rendering quality and performance

Desktop is the primary target. Use 16:9 at 1920×1080 as the initial composition baseline, with manual checks at larger and wider viewport sizes. The TV aspiration also warrants a 3840×2160 review when suitable hardware/display access is available; native TV software is not required.

Aim for smooth 60 fps playback on the representative desktop used during implementation. This is a provisional engineering target, not a guarantee for unspecified hardware. Record the actual browser, GPU, display resolution, and results during manual review.

Control rendering resolution and effect cost to maintain smooth movement. If quality must be reduced, first reduce expensive post-processing and incidental particle detail while preserving the globe's silhouette, surface legibility, and atmospheric edge. Quality adaptation should happen without visible interface or abrupt brightness changes.

Review in the user's primary desktop browser, with a secondary browser check when available. The specific browser and hardware have not yet been supplied and do not block this specification.

## Manual acceptance criteria

No automated tests are to be added. Evaluate the result directly in a browser:

1. On opening, the viewport contains the globe, decorative stars and satellites, and a subtle fullscreen button at bottom right, with no page scrolling. Clicking the button enters fullscreen and hides it; Escape returns to browser view and restores it.
2. At the default distance, the globe is fully framed and instantly recognisable as Earth. Surface relief, cool charcoal shading, and the atmospheric edge are visible.
3. The mood is recognisably close to the supplied references, with calm blue/violet light and deep space around the globe.
4. Stars and satellite-like particles contribute subtle depth. They neither obscure the Earth nor suggest a data feed; particles behind the Earth are correctly hidden.
5. Idle rotation is slow, smooth, and suitable for continuous viewing. Dragging and zooming feel responsive, stay within sensible limits, and return smoothly to idle motion.
6. Resizing and browser fullscreen preserve framing and image quality without stretching, unintended clipping, or scrollbars.
7. Loading has no white flash or incomplete globe. An essential rendering failure produces a clear exceptional message.
8. Reduced-motion mode produces a composed still scene while preserving direct manipulation. Returning from a hidden tab produces no animation jump.
9. A manual viewing session of at least 30 minutes shows no progressive slowdown, accumulating particles, or visible animation discontinuities. Record performance on the available desktop and review at TV scale if possible.
10. Verify that no fake activity, user count, geographic data markers, or columns appear, including when opening old `?style=columns` and `?style=halos` URLs.

Artistic acceptance should compare the globe, lighting, and spatial mood with the reference images, while judging the final scene on its own as ambient artwork.

## Delivery constraints and future milestones

Follow [AGENTS.md](../../AGENTS.md): use Three.js, keep linting and formatting fast in CI, run CI on `ubuntu-slim` or `ubuntu-latest`, and add no automated tests. The user's latest instruction overrides the normal PR workflow for this work: implement locally without pushing to a remote.

Implementation milestones:

1. Establish the minimal application and viewport composition, with a textured and lit Earth.
2. Refine the terrain, blue material treatment, atmosphere, and rendering quality.
3. Add restrained stars, satellite-like particles, and ambient motion.
4. Refine direct manipulation, resizing, reduced motion, loading, and sustained desktop performance.

The initial folder contained only the README, project instructions, inspiration images, and this specification. The local implementation now contains the application, assets, development scripts, and a fast Ubuntu CI configuration. No Git repository, remote, PR, or deployment was created as part of this local-only work.

See the [README](../../README.md) for run instructions and [manual review](../manual-review.md) for verification evidence and remaining display-specific checks.
