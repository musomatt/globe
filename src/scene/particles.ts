import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { settings } from "../config";

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aBrightness;
  attribute vec3 aColor;
  attribute float aSatellite;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform vec3 uLight;
  varying float vBrightness;
  varying vec3 vColor;
  void main() {
    vBrightness = aBrightness;
    vColor = aColor;
    vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    float glint = 0.0;
    if (aSatellite > 0.5) {
      // Fade through the Earth's shadow, including a soft penumbra.
      float alongLight = dot(worldPosition, uLight);
      float shadowRadius = length(worldPosition - uLight * alongLight);
      float illumination = mix(
        smoothstep(0.96, 1.06, shadowRadius),
        1.0,
        smoothstep(-0.15, 0.05, alongLight)
      );
      vec3 toViewer = normalize(cameraPosition - worldPosition);
      float phase = 0.5 + 0.5 * dot(toViewer, uLight);
      // Slow, offset panel orientations produce broad occasional reflections.
      float turn = aSatellite * 2.399963 + uTime * 0.025;
      vec3 panelNormal = normalize(vec3(
        sin(turn),
        0.55 * sin(aSatellite * 0.7 + uTime * 0.016),
        cos(turn)
      ));
      vec3 halfDirection = normalize(uLight + toViewer);
      glint = pow(max(dot(panelNormal, halfDirection), 0.0), 32.0) * illumination;
      vBrightness *= illumination * (0.65 + phase * 0.25) + glint * 0.55;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (1.0 + glint * 0.1);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vBrightness;
  varying vec3 vColor;
  void main() {
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    if (radius > 1.0) discard;
    float core = exp(-radius * radius * 10.0);
    float halo = exp(-radius * radius * 3.0) * 0.18;
    float alpha = (core + halo) * (1.0 - smoothstep(0.7, 1.0, radius));
    gl_FragColor = vec4(vColor, alpha * vBrightness);
    #include <colorspace_fragment>
  }
`;

// A stable seed keeps the composition consistent across reloads.
function randomGenerator(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createParticles() {
  const random = randomGenerator(23817);
  const count = settings.stars + settings.satellites;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const brightness = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const satelliteIds = new Float32Array(count);
  const color = new Color();
  const point = new Vector3();
  const orbits: {
    radius: number;
    phase: number;
    speed: number;
    tilt: number;
    node: number;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const satellite = i >= settings.stars;
    satelliteIds[i] = satellite ? i - settings.stars + 1 : 0;
    if (!satellite) {
      const z = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const radius = 35 + random() * 45;
      const radial = Math.sqrt(1 - z * z);
      point
        .set(radial * Math.cos(angle), z, radial * Math.sin(angle))
        .multiplyScalar(radius);
      point.toArray(positions, i * 3);
    } else {
      orbits.push({
        radius: 1.18 + random() * 0.48,
        phase: random() * Math.PI * 2,
        speed: (0.012 + random() * 0.008) * (random() > 0.5 ? 1 : -1),
        tilt: 0.2 + random() * 2.4,
        node: random() * Math.PI * 2,
      });
    }
    const bright = random() > 0.95;
    sizes[i] = satellite
      ? 5.0 + random() * 1.5
      : bright
        ? 3.6 + random() * 1.6
        : 1.0 + random() * 1.8;
    brightness[i] = satellite ? 0.64 : bright ? 0.85 : 0.2 + random() * 0.4;
    color.set(
      random() > 0.9 ? "#d8b694" : random() > 0.6 ? "#b5bada" : "#8eaccc",
    );
    color.toArray(colors, i * 3);
  }

  const geometry = new BufferGeometry();
  const positionAttribute = new BufferAttribute(positions, 3);
  positionAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
  geometry.setAttribute("aBrightness", new BufferAttribute(brightness, 1));
  geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
  geometry.setAttribute("aSatellite", new BufferAttribute(satelliteIds, 1));
  const material = new ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: 1 },
      uTime: { value: 0 },
      uLight: { value: new Vector3(...settings.lightDirection).normalize() },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;

  const update = (elapsed: number) => {
    material.uniforms.uTime.value = elapsed;
    for (let i = 0; i < orbits.length; i++) {
      const orbit = orbits[i];
      const angle = orbit.phase + elapsed * orbit.speed;
      const x = Math.cos(angle) * orbit.radius;
      const y = Math.sin(angle) * orbit.radius;
      const tiltedY = y * Math.cos(orbit.tilt);
      const tiltedZ = y * Math.sin(orbit.tilt);
      const offset = (settings.stars + i) * 3;
      positions[offset] =
        x * Math.cos(orbit.node) - tiltedZ * Math.sin(orbit.node);
      positions[offset + 1] = tiltedY;
      positions[offset + 2] =
        x * Math.sin(orbit.node) + tiltedZ * Math.cos(orbit.node);
    }
    positionAttribute.addUpdateRange(
      settings.stars * 3,
      settings.satellites * 3,
    );
    positionAttribute.needsUpdate = true;
  };
  update(0);

  return {
    points,
    update,
    setPixelRatio(ratio: number) {
      material.uniforms.uPixelRatio.value = ratio;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
