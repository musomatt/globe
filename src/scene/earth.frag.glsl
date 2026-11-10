uniform sampler2D uDay;
uniform sampler2D uNormal;
uniform sampler2D uWater;
uniform vec3 uLight;
uniform sampler2D uClouds;
uniform float uCloudRadius;
uniform float uCloudOffset;
uniform mat3 uWorldToSurface;
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec3 vWorldTangent;
varying vec3 vLocalPosition;

float waterHash(vec3 point) {
  point = fract(point * 0.1031);
  point += dot(point, point.yzx + 33.33);
  return fract((point.x + point.y) * point.z);
}

float waterRoughness(vec3 point) {
  vec3 cell = floor(point);
  vec3 blend = fract(point);
  blend = blend * blend * (3.0 - 2.0 * blend);
  return mix(
    mix(mix(waterHash(cell), waterHash(cell + vec3(1, 0, 0)), blend.x),
        mix(waterHash(cell + vec3(0, 1, 0)), waterHash(cell + vec3(1, 1, 0)), blend.x), blend.y),
    mix(mix(waterHash(cell + vec3(0, 0, 1)), waterHash(cell + vec3(1, 0, 1)), blend.x),
        mix(waterHash(cell + vec3(0, 1, 1)), waterHash(cell + vec3(1, 1, 1)), blend.x), blend.y),
    blend.z
  );
}

float cloudShadow() {
  vec2 uvDx = dFdx(vUv);
  vec2 uvDy = dFdy(vUv);
  vec3 localNormal = normalize(vLocalPosition);
  vec3 localLight = uWorldToSurface * uLight;
  float incidence = dot(localNormal, localLight);
  if (incidence <= 0.0) return 0.0;
  // Follow the light ray up to the cloud shell so shadows track its drift.
  float distanceToCloud = -incidence + sqrt(incidence * incidence + uCloudRadius * uCloudRadius - 1.0);
  vec3 cloudPoint = normalize(localNormal + localLight * distanceToCloud);
  vec2 shadowUv = vec2(
    atan(cloudPoint.z, -cloudPoint.x) / 6.28318530718 + uCloudOffset,
    asin(clamp(cloudPoint.y, -1.0, 1.0)) / 3.14159265359 + 0.5
  );
  // Reuse the surface footprint across atan's longitude seam.
  float coverage = smoothstep(0.12, 0.82, textureGrad(uClouds, shadowUv, uvDx, uvDy).r);
  return coverage * smoothstep(0.0, 0.18, incidence);
}

// A smooth spherical frame avoids lighting seams between latitude rows.
vec3 surfaceNormal(vec3 geometricNormal) {
  vec3 tangent = normalize(vWorldTangent - geometricNormal * dot(vWorldTangent, geometricNormal));
  vec3 bitangent = cross(geometricNormal, tangent);
  // Preserve the equirectangular map's existing relief scale toward the poles.
  float latitudeScale = 2.0 * sin(vUv.y * 3.14159265359);
  tangent /= max(latitudeScale, 1.0);
  bitangent *= min(latitudeScale, 1.0);
  // Blend neighbouring normal samples to soften quantised relief steps.
  vec2 texel = 1.0 / vec2(textureSize(uNormal, 0));
  vec2 footprint = max(fwidth(vUv) * 0.6, texel);
  vec3 mapped = texture2D(uNormal, vUv).xyz * 0.5;
  mapped += texture2D(uNormal, vUv + vec2(footprint.x, 0.0)).xyz * 0.125;
  mapped += texture2D(uNormal, vUv - vec2(footprint.x, 0.0)).xyz * 0.125;
  mapped += texture2D(uNormal, vUv + vec2(0.0, footprint.y)).xyz * 0.125;
  mapped += texture2D(uNormal, vUv - vec2(0.0, footprint.y)).xyz * 0.125;
  mapped = mapped * 2.0 - 1.0;
  mapped.xy *= 3.2;
  return normalize(mat3(tangent, bitangent, geometricNormal) * mapped);
}

void main() {
  vec3 geometricNormal = normalize(vWorldNormal);
  vec3 normal = surfaceNormal(geometricNormal);
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float viewCosine = max(dot(geometricNormal, viewDirection), 0.0);
  vec3 day = texture2D(uDay, vUv).rgb;
  float water = smoothstep(0.1, 0.85, texture2D(uWater, vUv).r);
  float detail = pow(clamp(dot(day, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0), 0.45);

  vec3 landColor = mix(vec3(0.010, 0.018, 0.040), vec3(0.040, 0.068, 0.13), detail);
  vec3 oceanColor = vec3(0.0025, 0.006, 0.018);
  vec3 albedo = mix(landColor, oceanColor, water);

  float sunlight = max(dot(normal, uLight), 0.0);
  float cloudTransmission = 1.0 - cloudShadow() * 0.16;
  float skyFill = 0.5 + 0.5 * dot(normal, normalize(vec3(-0.6, 0.5, 1.0)));
  vec3 lighting = vec3(0.10, 0.15, 0.27) + sunlight * cloudTransmission * vec3(1.0, 1.18, 1.62);
  lighting += skyFill * vec3(0.16, 0.13, 0.26);
  vec3 color = albedo * lighting;

  vec3 halfDirection = normalize(uLight + viewDirection);
  vec3 waterPoint = normalize(vLocalPosition) * 180.0;
  float waterFootprint = length(fwidth(waterPoint));
  float roughness = 0.5;
  if (water > 0.01) {
    // Three-dimensional noise follows the sphere without a longitude seam.
    roughness = waterRoughness(waterPoint + vec3(uTime * 0.012, 0.0, uTime * 0.008));
    // Fade detail below the pixel footprint to avoid sparkling or new bands.
    roughness = mix(roughness, 0.5, smoothstep(0.65, 2.0, waterFootprint));
  }
  float specular = pow(max(dot(normal, halfDirection), 0.0), mix(34.0, 66.0, roughness));
  // Water reflects more at grazing angles. Keep the sharp glint and broad
  // reflected light separate so the ocean stays dark when viewed head-on.
  float waterFresnel = 0.02 + 0.98 * pow(1.0 - viewCosine, 5.0);
  float glintFresnel = 0.02 + 0.98 * pow(1.0 - max(dot(viewDirection, halfDirection), 0.0), 5.0);
  vec3 reflectedView = reflect(-viewDirection, geometricNormal);
  float reflectedLight = smoothstep(-0.45, 0.85, dot(reflectedView, uLight));
  float waterLight = smoothstep(-0.08, 0.45, dot(geometricNormal, uLight));
  vec3 glint = specular * mix(0.72, 1.10, roughness) * (glintFresnel / 0.02) * vec3(0.014, 0.025, 0.038);
  vec3 sheen = waterFresnel * reflectedLight * mix(0.78, 1.08, roughness) * vec3(0.060, 0.075, 0.090);
  color += water * waterLight * cloudTransmission * (glint + sheen);

  // A longer path through a thin air layer gently reduces horizon contrast.
  // Use the smooth sphere normal so terrain relief cannot band the haze.
  float hazeHeight = 0.018;
  float shellDepth = hazeHeight * (2.0 + hazeHeight);
  float airPath = shellDepth / (sqrt(viewCosine * viewCosine + shellDepth) + viewCosine);
  float horizonDepth = max(airPath / hazeHeight - 1.0, 0.0);
  float hazeLight = smoothstep(-0.12, 0.75, dot(geometricNormal, uLight));
  float hazeOpacity = (1.0 - exp(-horizonDepth * 0.065)) * hazeLight * 0.65;
  color = mix(color, vec3(0.060, 0.075, 0.095), hazeOpacity);

  float fresnel = pow(1.0 - viewCosine, 4.5);
  float rimLight = smoothstep(-0.12, 0.85, dot(geometricNormal, uLight));
  vec3 rimColor = mix(vec3(0.028, 0.026, 0.085), vec3(0.075, 0.25, 0.53), rimLight);
  color += rimColor * fresnel * (0.025 + pow(rimLight, 1.8) * 0.85);

  // Cool charcoal: soften the blue cast while retaining the lit terrain detail.
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luminance), color, 0.55) * 0.82;

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // Dither in display colour space, just before the 8-bit framebuffer rounds it.
  // A static, sub-level pattern smooths dark gradients without animated grain.
  float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  gl_FragColor.rgb += (noise - 0.5) / 255.0;
}
