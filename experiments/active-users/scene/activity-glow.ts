import {
  AdditiveBlending,
  type Camera,
  Color,
  Group,
  type Mesh,
  MeshBasicMaterial,
  Mesh as OccluderMesh,
  Scene,
  Vector2,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

type ActivityLayer = {
  group: Group;
  setPixelRatio: (ratio: number) => void;
};

// Render only activity into a floating-point bloom buffer, preserving the
// existing globe/background colour grading and display-space dithering.
export function createActivityGlow(
  renderer: WebGLRenderer,
  camera: Camera,
  surface: Mesh,
  activity: ActivityLayer,
) {
  const scene = new Scene();
  const anchor = new Group();
  anchor.matrixAutoUpdate = false;
  const occluderMaterial = new MeshBasicMaterial({ color: 0x000000 });
  const occluder = new OccluderMesh(surface.geometry, occluderMaterial);
  anchor.add(occluder, activity.group);
  scene.add(anchor);

  const composer = new EffectComposer(renderer);
  composer.renderTarget1.samples = 2;
  composer.renderTarget2.samples = 2;
  const renderPass = new RenderPass(
    scene,
    camera,
    undefined,
    new Color(0x000000),
    0,
  );
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.5, 0.22, 1.3);
  const output = new OutputPass();
  output.material.transparent = true;
  output.material.blending = AdditiveBlending;
  output.material.premultipliedAlpha = true;
  output.material.depthTest = false;
  output.material.depthWrite = false;
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);

  return {
    render(delta: number) {
      surface.updateWorldMatrix(true, false);
      anchor.matrix.copy(surface.matrixWorld);
      anchor.matrixWorldNeedsUpdate = true;
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      composer.render(delta);
      renderer.autoClear = autoClear;
    },
    resize(width: number, height: number, ratio: number) {
      composer.setPixelRatio(ratio);
      composer.setSize(width, height);
      activity.setPixelRatio(ratio);
    },
    dispose() {
      occluderMaterial.dispose();
      bloom.dispose();
      output.dispose();
      composer.dispose();
      scene.clear();
    },
  };
}
