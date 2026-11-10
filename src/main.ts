import "./style.css";
import {
  ACESFilmicToneMapping,
  MathUtils,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { settings } from "./config";
import { setupFullscreen } from "./fullscreen";
import { createEarth } from "./scene/earth";
import { createParticles } from "./scene/particles";
import { createSpace } from "./scene/space";

const canvas = document.querySelector<HTMLCanvasElement>("#globe");
const errorMessage = document.querySelector<HTMLParagraphElement>("#error");
const fullscreenButton =
  document.querySelector<HTMLButtonElement>("#fullscreen");
if (!canvas || !errorMessage || !fullscreenButton)
  throw new Error("Globe mount elements are missing.");

const disposeFullscreen = setupFullscreen(fullscreenButton);
import.meta.hot?.dispose(disposeFullscreen);
const recordMode =
  import.meta.env.DEV && new URLSearchParams(location.search).has("record");

function showError(error: unknown) {
  console.error("Globe could not render:", error);
  if (errorMessage) {
    errorMessage.textContent =
      "The globe couldn’t load. Please refresh, or try a browser with hardware acceleration enabled.";
    errorMessage.hidden = false;
  }
}

async function start(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor("#02050c");
  renderer.info.autoReset = false;

  const scene = new Scene();
  const camera = new PerspectiveCamera(settings.fieldOfView, 1, 0.05, 160);
  camera.position.set(0, 0, 4.5);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.rotateSpeed = 0.38;
  controls.zoomSpeed = 0.55;
  controls.minPolarAngle = 0.14;
  controls.maxPolarAngle = Math.PI - 0.14;

  const space = createSpace();
  const particles = createParticles();
  scene.add(space.mesh, particles.points);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  let earth: Awaited<ReturnType<typeof createEarth>> | undefined;
  let disposeRecording: (() => void) | undefined;
  let disposed = false;
  let ready = false;
  let dragging = false;
  let elapsed = 0;
  let particleTime = 0;
  let previousTime = 0;
  let lastInteraction = -settings.idleDelay;
  let lastPointerMove = 0;
  let rotationSpeed = 0;
  let fittedDistance = 0;
  let quality = 1;
  let sampleTime = 0;
  let sampleFrames = 0;
  let diagnosticTime = 0;
  let diagnosticFrames = 0;

  function resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    camera.aspect = width / height;
    const angle = Math.atan(
      Math.tan(MathUtils.degToRad(settings.fieldOfView / 2)) *
        Math.min(camera.aspect, 1),
    );
    const nextDistance = 1 / Math.sin(angle * settings.framing);
    camera.position.multiplyScalar(
      nextDistance / (fittedDistance || camera.position.length()),
    );
    fittedDistance = nextDistance;
    controls.minDistance = 1.65;
    controls.maxDistance = fittedDistance * 1.65;
    camera.updateProjectionMatrix();
    const ratio =
      Math.min(
        recordMode ? 1 : window.devicePixelRatio,
        settings.maxPixelRatio,
        Math.sqrt(settings.maxRenderPixels / (width * height)),
      ) * quality;
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    particles.setPixelRatio(ratio);
    controls.update();
    sampleFrames = 0;
    sampleTime = 0;
  }

  function animate(time: number) {
    if (disposed || !ready || !earth) return;
    const delta = previousTime
      ? Math.min((time - previousTime) / 1000, 0.05)
      : 0;
    const frameTime = previousTime ? (time - previousTime) / 1000 : 0;
    previousTime = time;
    elapsed += delta;
    const idle = !dragging && elapsed - lastInteraction > settings.idleDelay;
    const targetSpeed =
      idle && !reducedMotion.matches
        ? (Math.PI * 2) / settings.revolutionSeconds
        : 0;
    rotationSpeed = MathUtils.damp(rotationSpeed, targetSpeed, 2, delta);
    if (!dragging && !reducedMotion.matches)
      earth.surface.rotation.y += rotationSpeed * delta;
    if (!reducedMotion.matches) {
      particleTime += delta;
      particles.update(particleTime);
    }
    earth.update(particleTime);
    controls.update(delta);
    renderer.info.reset();
    renderer.render(scene, camera);
    canvas.style.cursor = dragging
      ? "grabbing"
      : elapsed - lastPointerMove > 3
        ? "none"
        : "grab";

    if (import.meta.env.DEV && frameTime > 0 && frameTime < 0.25) {
      diagnosticTime += frameTime;
      diagnosticFrames++;
      if (diagnosticTime >= 30) {
        console.debug(
          "Globe performance",
          JSON.stringify({
            fps: Math.round(diagnosticFrames / diagnosticTime),
            drawCalls: renderer.info.render.calls,
            textures: renderer.info.memory.textures,
            geometries: renderer.info.memory.geometries,
            renderSize: [canvas.width, canvas.height],
            reducedMotion: reducedMotion.matches,
            rotation: Number(earth.surface.rotation.y.toFixed(4)),
          }),
        );
        diagnosticTime = 0;
        diagnosticFrames = 0;
      }
    }

    // Lower pixel cost only after sustained slow frames, avoiding quality oscillation.
    if (!recordMode && frameTime > 0 && frameTime < 0.25 && elapsed > 5) {
      sampleTime += frameTime;
      sampleFrames++;
      if (sampleTime > 5) {
        if (sampleFrames / sampleTime < 45 && quality > 0.65) {
          quality = Math.max(0.65, quality - 0.1);
          resize();
        }
        sampleTime = 0;
        sampleFrames = 0;
      }
    }
  }

  function resume() {
    previousTime = 0;
    sampleTime = 0;
    sampleFrames = 0;
    diagnosticTime = 0;
    diagnosticFrames = 0;
    if (ready && !disposed && !document.hidden)
      renderer.setAnimationLoop(animate);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    events.abort();
    controls.dispose();
    disposeRecording?.();
    earth?.dispose();
    particles.dispose();
    space.dispose();
    scene.clear();
    renderer.dispose();
  }

  controls.addEventListener("start", () => {
    dragging = true;
    rotationSpeed = 0;
    lastInteraction = elapsed;
  });
  controls.addEventListener("end", () => {
    dragging = false;
    lastInteraction = elapsed;
  });
  canvas.addEventListener(
    "pointermove",
    () => {
      lastPointerMove = elapsed;
    },
    { signal: events.signal },
  );
  window.addEventListener("resize", resize, { signal: events.signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) renderer.setAnimationLoop(null);
      else resume();
    },
    { signal: events.signal },
  );
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) renderer.setAnimationLoop(null);
      else dispose();
    },
    { signal: events.signal },
  );
  window.addEventListener("pageshow", resume, { signal: events.signal });
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      renderer.setAnimationLoop(null);
      canvas.classList.remove("ready");
      showError(new Error("Graphics context was lost."));
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      if (errorMessage) errorMessage.hidden = true;
      canvas.classList.add("ready");
      resume();
    },
    { signal: events.signal },
  );

  import.meta.hot?.dispose(dispose);
  resize();
  try {
    const loadedEarth = await createEarth(
      renderer.capabilities.getMaxAnisotropy(),
    );
    if (disposed) {
      loadedEarth.dispose();
      return;
    }
    earth = loadedEarth;
    scene.add(earth.group);
    await renderer.compileAsync(scene, camera);
    if (disposed) return;
    renderer.info.reset();
    renderer.render(scene, camera);
    if (import.meta.env.DEV) {
      const gl = renderer.getContext();
      const debugRenderer = gl.getExtension("WEBGL_debug_renderer_info");
      console.debug(
        "Globe renderer",
        JSON.stringify({
          gpu: debugRenderer
            ? gl.getParameter(debugRenderer.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
          maxTextureSize: renderer.capabilities.maxTextureSize,
        }),
      );
    }
    ready = true;
    canvas.classList.add("ready");
    resume();
    if (recordMode) {
      const { recordPreview } = await import("./recording");
      if (!disposed) disposeRecording = recordPreview(canvas);
    }
  } catch (error) {
    dispose();
    throw error;
  }
}

start(canvas).catch(showError);
