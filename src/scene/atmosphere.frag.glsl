uniform vec3 uLight;
varying vec3 vWorldPosition;

void main() {
  vec3 rayDirection = normalize(vWorldPosition - cameraPosition);
  float distanceToCenter = length(cross(cameraPosition, rayDirection));
  float height = max(distanceToCenter - 1.0, 0.0) / 0.055;
  float density = exp(-height * 8.0) * (1.0 - smoothstep(0.35, 0.85, height));
  vec3 closestPoint = cameraPosition - dot(cameraPosition, rayDirection) * rayDirection;
  float illumination = smoothstep(-0.10, 0.75, dot(normalize(closestPoint), uLight));
  vec3 color = mix(vec3(0.10, 0.065, 0.27), vec3(0.14, 0.48, 0.94), illumination);
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luminance), color, 0.60) * 0.80;
  gl_FragColor = vec4(color, density * (0.012 + pow(illumination, 1.3) * 0.68));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
