varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldTangent;
varying vec3 vLocalPosition;

void main() {
  vUv = uv;
  vLocalPosition = position;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  float longitude = uv.x * 6.28318530718;
  vWorldTangent = mat3(modelMatrix) * vec3(sin(longitude), 0.0, cos(longitude));
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
