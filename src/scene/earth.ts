import {
  AdditiveBlending,
  BackSide,
  Group,
  Matrix3,
  Mesh,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import { settings } from "../config";
import atmosphereFragment from "./atmosphere.frag.glsl?raw";
import cloudsFragment from "./clouds.frag.glsl?raw";
import fragmentShader from "./earth.frag.glsl?raw";
import vertexShader from "./earth.vert.glsl?raw";

export async function createEarth(anisotropy: number) {
  const loader = new TextureLoader();
  const results = await Promise.allSettled(
    [
      "earth-day.jpg",
      "earth-normal.webp",
      "earth-water.webp",
      "earth-clouds.jpg",
    ].map((file) =>
      loader.loadAsync(`${import.meta.env.BASE_URL}textures/${file}`),
    ),
  );
  const textures = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  if (textures.length !== results.length) {
    for (const texture of textures) texture.dispose();
    throw new Error("Earth textures could not be loaded.");
  }
  for (const texture of textures) {
    texture.anisotropy = Math.min(anisotropy, 8);
    texture.wrapS = RepeatWrapping;
  }
  textures[0].colorSpace = SRGBColorSpace;

  const light = new Vector3(...settings.lightDirection).normalize();
  const cloudRadius = 1.006;
  const worldToSurface = new Matrix3();
  const geometry = new SphereGeometry(1, 160, 96);
  const surfaceMaterial = new ShaderMaterial({
    uniforms: {
      uDay: { value: textures[0] },
      uNormal: { value: textures[1] },
      uWater: { value: textures[2] },
      uLight: { value: light },
      uClouds: { value: textures[3] },
      uCloudRadius: { value: cloudRadius },
      uCloudOffset: { value: 0 },
      uWorldToSurface: { value: worldToSurface },
      uTime: { value: 0 },
    },
    vertexShader,
    fragmentShader,
  });
  const surface = new Mesh(geometry, surfaceMaterial);
  // Equirectangular maps start at -180°. Present Africa and Europe initially.
  surface.rotation.y = -Math.PI * 0.64;

  const cloudsMaterial = new ShaderMaterial({
    uniforms: {
      uClouds: { value: textures[3] },
      uLight: { value: light },
    },
    vertexShader,
    fragmentShader: cloudsFragment,
    transparent: true,
    depthWrite: false,
  });
  const clouds = new Mesh(geometry, cloudsMaterial);
  clouds.scale.setScalar(cloudRadius);
  clouds.renderOrder = 1;

  const atmosphereMaterial = new ShaderMaterial({
    uniforms: { uLight: { value: light } },
    vertexShader,
    fragmentShader: atmosphereFragment,
    side: BackSide,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  const atmosphere = new Mesh(geometry, atmosphereMaterial);
  atmosphere.scale.setScalar(1.055);
  const group = new Group();
  group.rotation.z = -0.12;
  group.rotation.x = 0.18;
  group.add(surface, atmosphere, clouds);

  const update = (elapsed: number) => {
    const drift = elapsed * 0.0012;
    clouds.rotation.y = surface.rotation.y + drift;
    surfaceMaterial.uniforms.uCloudOffset.value = -drift / (Math.PI * 2);
    surfaceMaterial.uniforms.uTime.value = elapsed;
    surface.updateWorldMatrix(true, false);
    worldToSurface.setFromMatrix4(surface.matrixWorld).invert();
  };
  update(0);

  return {
    group,
    surface,
    update,
    dispose() {
      geometry.dispose();
      surfaceMaterial.dispose();
      atmosphereMaterial.dispose();
      cloudsMaterial.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
