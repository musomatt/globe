import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from "three";

export function createSpace() {
  const geometry = new SphereGeometry(100, 32, 16);
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vec3 direction = normalize(vDirection);
        float glow = pow(max(dot(direction, normalize(vec3(0.5, 0.25, -1.0))), 0.0), 3.0);
        vec3 color = mix(vec3(0.0006, 0.0012, 0.0028), vec3(0.0022, 0.0045, 0.010), glow);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
        // Subtle dithering prevents visible bands in the near-black gradient.
        float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        gl_FragColor.rgb += (noise - 0.5) / 255.0;
      }
    `,
    toneMapped: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.renderOrder = -1;
  return {
    mesh,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
