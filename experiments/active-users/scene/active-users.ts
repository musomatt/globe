import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import snapshot from "../data/active-users.json";

export const activeUsers = snapshot.users;

const pointVertex = /* glsl */ `
  attribute vec3 aSurface;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  uniform float uSize;
  varying vec3 vColor;
  varying float vVisibility;
  void main() {
    vec3 surface = (modelMatrix * vec4(aSurface, 1.0)).xyz;
    vec3 normal = normalize(mat3(modelMatrix) * aSurface);
    float facing = dot(normal, normalize(cameraPosition - surface));
    vVisibility = smoothstep(0.01, 0.20, facing);
    vColor = aColor;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = uSize * uPixelRatio * clamp(4.4 / -viewPosition.z, 0.7, 1.8);
  }
`;

const pointFragment = /* glsl */ `
  uniform float uCore;
  varying vec3 vColor;
  varying float vVisibility;
  void main() {
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    if (radius > 1.0 || vVisibility < 0.001) discard;
    float core = exp(-radius * radius * 130.0);
    float halo = exp(-radius * radius * 11.0);
    vec3 emission = vec3(core * uCore) + vColor * (core * 3.0 + halo * 0.18);
    gl_FragColor = vec4(emission, vVisibility * (1.0 - smoothstep(0.7, 1.0, radius)));
  }
`;

export function createActiveUsers() {
  const count = activeUsers.length;
  const surfaces = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cities = new Map<string, { direction: Vector3; count: number }>();
  const direction = new Vector3();
  const tint = new Color();

  activeUsers.forEach((user, index) => {
    const latitude = (user.latitude * Math.PI) / 180;
    const longitude = (user.longitude * Math.PI) / 180;
    // Match the Earth texture's equirectangular UVs and Three.js sphere axes.
    direction.set(
      Math.cos(latitude) * Math.cos(longitude),
      Math.sin(latitude),
      -Math.cos(latitude) * Math.sin(longitude),
    );
    direction
      .clone()
      .multiplyScalar(1.009)
      .toArray(surfaces, index * 3);
    tint.set(index % 7 === 0 ? "#a193ff" : "#61efff");
    tint.toArray(colors, index * 3);
    const key = `${user.country}/${user.city}`;
    const city = cities.get(key);
    if (city) {
      city.direction.add(direction);
      city.count++;
    } else {
      cities.set(key, { direction: direction.clone(), count: 1 });
    }
  });

  // Keep all 200 surface locations, but combine overlapping city beams.
  // Height represents concurrent users in that city, not census population.
  const cityCount = cities.size;
  const citySurfaces = new Float32Array(cityCount * 3);
  const tips = new Float32Array(cityCount * 3);
  const cityColors = new Float32Array(cityCount * 3);
  const stemPositions = new Float32Array(cityCount * 12);
  const stemSurfaces = new Float32Array(cityCount * 12);
  const stemColors = new Float32Array(cityCount * 12);
  const stemUvs = new Float32Array(cityCount * 8);
  const stemWidths = new Float32Array(cityCount * 4);
  const stemPhases = new Float32Array(cityCount * 4);
  const indices: number[] = [];

  [...cities.values()].forEach((city, index) => {
    direction.copy(city.direction).normalize();
    const height = Math.min(0.3, 0.055 + (city.count - 1) * 0.045);
    const width = Math.min(0.026, 0.016 + (city.count - 1) * 0.002);
    const base = direction.clone().multiplyScalar(1.009);
    const tip = direction.clone().multiplyScalar(1.009 + height);
    base.toArray(citySurfaces, index * 3);
    tip.toArray(tips, index * 3);
    tint.set(index % 7 === 0 ? "#a193ff" : "#61efff");
    tint.toArray(cityColors, index * 3);

    for (let corner = 0; corner < 4; corner++) {
      const vertex = index * 4 + corner;
      (corner < 2 ? base : tip).toArray(stemPositions, vertex * 3);
      base.toArray(stemSurfaces, vertex * 3);
      tint.toArray(stemColors, vertex * 3);
      stemUvs[vertex * 2] = corner % 2;
      stemUvs[vertex * 2 + 1] = corner < 2 ? 0 : 1;
      stemWidths[vertex] = width;
      stemPhases[vertex] = (index * 0.61803398875) % 1;
    }
    const first = index * 4;
    indices.push(first, first + 1, first + 2, first + 2, first + 1, first + 3);
  });

  function pointGeometry(
    positions: Float32Array,
    roots: Float32Array,
    tints: Float32Array,
  ) {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aSurface", new BufferAttribute(roots, 3));
    geometry.setAttribute("aColor", new BufferAttribute(tints, 3));
    return geometry;
  }

  function pointMaterial(size: number, core: number) {
    return new ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: 1 },
        uSize: { value: size },
        uCore: { value: core },
      },
      vertexShader: pointVertex,
      fragmentShader: pointFragment,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
  }

  const bases = new Points(
    pointGeometry(surfaces, surfaces, colors),
    pointMaterial(13, 1.8),
  );
  const heads = new Points(
    pointGeometry(tips, citySurfaces, cityColors),
    pointMaterial(10, 4.5),
  );
  const stemGeometry = new BufferGeometry();
  stemGeometry.setIndex(indices);
  stemGeometry.setAttribute("position", new BufferAttribute(stemPositions, 3));
  stemGeometry.setAttribute("aSurface", new BufferAttribute(stemSurfaces, 3));
  stemGeometry.setAttribute("aColor", new BufferAttribute(stemColors, 3));
  stemGeometry.setAttribute("uv", new BufferAttribute(stemUvs, 2));
  stemGeometry.setAttribute("aWidth", new BufferAttribute(stemWidths, 1));
  stemGeometry.setAttribute("aPhase", new BufferAttribute(stemPhases, 1));
  const stemMaterial = new ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec3 aSurface;
      attribute vec3 aColor;
      attribute float aWidth;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vVisibility;
      varying vec2 vUv;
      varying float vPhase;
      void main() {
        vec3 surface = (modelMatrix * vec4(aSurface, 1.0)).xyz;
        vec3 normal = normalize(mat3(modelMatrix) * aSurface);
        float facing = dot(normal, normalize(cameraPosition - surface));
        vVisibility = smoothstep(0.01, 0.20, facing);
        vColor = aColor;
        vUv = uv;
        vPhase = aPhase;
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 axis = normalize(mat3(modelViewMatrix) * aSurface);
        vec3 sideways = cross(axis, normalize(-viewPosition.xyz));
        sideways = length(sideways) > 0.0001 ? normalize(sideways) : vec3(1.0, 0.0, 0.0);
        viewPosition.xyz += sideways * (uv.x - 0.5) * aWidth;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vColor;
      varying float vVisibility;
      varying vec2 vUv;
      varying float vPhase;
      void main() {
        // A broad, low-contrast highlight travels upward in ~11 seconds.
        // It begins/ends outside the column, so wrapping never flashes.
        float travel = fract(uTime / 26.0 + vPhase) * 2.3 - 0.65;
        float band = exp(-pow((vUv.y - travel) / 0.26, 2.0));
        float across = abs(vUv.x * 2.0 - 1.0);
        float edge = 1.0 - smoothstep(0.35, 1.0, across);
        float core = exp(-across * across * 7.0);
        float emission = mix(0.55, 1.1, vUv.y) + band * 0.45;
        vec3 light = vColor * emission + vec3(core * 0.12);
        gl_FragColor = vec4(light, edge * vVisibility * 0.8);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: DoubleSide,
  });
  const stems = new Mesh(stemGeometry, stemMaterial);
  const group = new Group();
  group.add(stems, bases, heads);
  group.renderOrder = 3;
  for (const object of group.children) object.frustumCulled = false;

  return {
    group,
    update(elapsed: number) {
      stemMaterial.uniforms.uTime.value = elapsed;
    },
    setPixelRatio(ratio: number) {
      bases.material.uniforms.uPixelRatio.value = ratio;
      heads.material.uniforms.uPixelRatio.value = ratio;
    },
    dispose() {
      for (const object of [bases, heads, stems]) {
        object.geometry.dispose();
        object.material.dispose();
      }
    },
  };
}
