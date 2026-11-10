uniform sampler2D uClouds;
uniform vec3 uLight;
varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
  float coverage = smoothstep(0.12, 0.82, texture2D(uClouds, vUv).r);
  float sunlight = max(dot(normalize(vWorldNormal), uLight), 0.0);
  float illumination = smoothstep(-0.12, 0.65, dot(normalize(vWorldNormal), uLight));
  vec3 color = vec3(0.070, 0.079, 0.095) * (0.24 + sunlight * 0.76);
  float opacity = coverage * 0.24 * (0.16 + illumination * 0.84);
  gl_FragColor = vec4(color, opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
