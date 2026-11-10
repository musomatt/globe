import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from "three";
import snapshot from "../data/active-users.json";

// An alternative treatment of the same snapshot. Each city has a surface halo;
// its area and the number of orbiting lights encode its concurrent-user count.
export function createActivityHalos() {
  const cities = new Map<string, { direction: Vector3; count: number }>();
  for (const user of snapshot.users) {
    const latitude = (user.latitude * Math.PI) / 180;
    const longitude = (user.longitude * Math.PI) / 180;
    const direction = new Vector3(
      Math.cos(latitude) * Math.cos(longitude),
      Math.sin(latitude),
      -Math.cos(latitude) * Math.sin(longitude),
    );
    const key = `${user.country}/${user.city}`;
    const city = cities.get(key);
    if (city) {
      city.direction.add(direction);
      city.count++;
    } else {
      cities.set(key, { direction, count: 1 });
    }
  }

  const centres = new Float32Array(cities.size * 3);
  const east = new Float32Array(cities.size * 3);
  const north = new Float32Array(cities.size * 3);
  const counts = new Float32Array(cities.size);
  const phases = new Float32Array(cities.size);
  const tangent = new Vector3();
  const bitangent = new Vector3();
  [...cities.values()].forEach((city, index) => {
    const direction = city.direction.normalize();
    direction.toArray(centres, index * 3);
    tangent.set(direction.z, 0, -direction.x);
    if (tangent.lengthSq() < 0.000001) tangent.set(1, 0, 0);
    tangent.normalize().toArray(east, index * 3);
    bitangent.crossVectors(direction, tangent).toArray(north, index * 3);
    counts[index] = city.count;
    phases[index] = (index * 0.61803398875) % 1;
  });

  // Subdivided patches are projected onto the sphere, not drawn as billboards.
  // Instancing keeps every city's filaments, glow and user lights in one draw.
  const patch = new PlaneGeometry(2, 2, 8, 8);
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(patch.index);
  geometry.setAttribute("position", patch.getAttribute("position"));
  geometry.setAttribute("uv", patch.getAttribute("uv"));
  geometry.setAttribute("aCentre", new InstancedBufferAttribute(centres, 3));
  geometry.setAttribute("aEast", new InstancedBufferAttribute(east, 3));
  geometry.setAttribute("aNorth", new InstancedBufferAttribute(north, 3));
  geometry.setAttribute("aCount", new InstancedBufferAttribute(counts, 1));
  geometry.setAttribute("aPhase", new InstancedBufferAttribute(phases, 1));
  geometry.instanceCount = cities.size;
  patch.dispose();

  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCyan: { value: new Color("#55e5ff") },
      uViolet: { value: new Color("#a381ff") },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aCentre;
      attribute vec3 aEast;
      attribute vec3 aNorth;
      attribute float aCount;
      attribute float aPhase;
      varying vec2 vLocal;
      varying float vCount;
      varying float vPhase;
      varying float vVisibility;
      void main() {
        vLocal = uv * 2.0 - 1.0;
        vCount = aCount;
        vPhase = aPhase;
        float extent = 0.038 * sqrt(aCount);
        vec3 local = normalize(aCentre + extent * (aEast * vLocal.x + aNorth * vLocal.y));
        vec3 world = (modelMatrix * vec4(local * 1.009, 1.0)).xyz;
        vec3 normal = normalize(mat3(modelMatrix) * local);
        float facing = dot(normal, normalize(cameraPosition - world));
        vVisibility = smoothstep(0.01, 0.22, facing);
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uCyan;
      uniform vec3 uViolet;
      varying vec2 vLocal;
      varying float vCount;
      varying float vPhase;
      varying float vVisibility;
      const float TAU = 6.28318530718;

      float filament(float radius, float target, float thickness) {
        float width = max(thickness, fwidth(radius) * 0.65);
        // Preserve energy as filtering widens a foreshortened filament.
        return exp(-pow((radius - target) / width, 2.0)) * thickness / width;
      }

      void main() {
        float radius = length(vLocal);
        if (radius > 1.0 || vVisibility < 0.001) discard;
        float angle = atan(vLocal.y, vLocal.x);
        float rotation = uTime * TAU / (58.0 + vPhase * 16.0) + vPhase * TAU;

        // A quiet cyan crescent inside a violet orbit. Motion is continuous;
        // no pulsing, expanding radar rings, or implied connections between cities.
        float crescent = pow(0.5 + 0.5 * cos(angle - rotation * 0.65), 3.0);
        float inner = filament(radius, 0.59, 0.018);
        float outer = filament(radius, 0.83, 0.009);
        float mist = exp(-radius * radius * 7.5);
        float centre = exp(-radius * radius / 0.0025);
        vec3 light = uCyan * (inner * (0.35 + crescent * 1.5) + mist * 0.11);
        light += uViolet * outer * 0.24;
        light += mix(uCyan, vec3(1.0), 0.65) * centre * 4.0;

        // One light per user, evenly spaced within its city's halo. These local
        // orbits express presence, not movement of people or travel routes.
        float spacing = TAU / vCount;
        float behind = mod(rotation - angle + TAU * 2.0, spacing);
        float nearest = min(behind, spacing - behind);
        float distanceToLight = length(vec2((radius - 0.83), nearest * 0.83));
        float lightWidth = max(0.028, fwidth(radius) * 0.65);
        float lightEnergy = pow(0.028 / lightWidth, 2.0);
        float pearl = exp(-pow(distanceToLight / lightWidth, 2.0)) * lightEnergy;
        float pearlGlow = exp(-pow(distanceToLight / (lightWidth * 2.8), 2.0)) * lightEnergy;
        float trail = exp(-behind / 0.22) * filament(radius, 0.83, 0.017);
        light += mix(uCyan, uViolet, 0.45) * (trail * 2.1 + pearlGlow * 0.5);
        light += mix(uCyan, vec3(1.0), 0.85) * pearl * 6.0;
        float edge = 1.0 - smoothstep(0.93, 1.0, radius);
        gl_FragColor = vec4(light, vVisibility * edge);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    side: DoubleSide,
  });
  const halos = new Mesh(geometry, material);
  halos.frustumCulled = false;
  const group = new Group();
  group.add(halos);
  group.renderOrder = 3;

  return {
    group,
    update(elapsed: number) {
      material.uniforms.uTime.value = elapsed;
    },
    setPixelRatio(_ratio: number) {
      // Screen-space derivatives keep the filaments smooth at any resolution.
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
