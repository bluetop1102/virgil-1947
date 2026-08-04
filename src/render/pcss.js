// PCSS(Percentage-Closer Soft Shadows) — three의 VSM getShadow를 차폐거리 인지 버전으로 교체한다.
//
// 기본 VSM은 shadow.radius로 정한 고정 폭 블러라 페넘브라가 거리와 무관하다 — 차폐물이 몇 미터
// 떨어져 있어도 경계가 그대로 날카롭고, 접촉부와 원거리 그림자가 구분되지 않는다(루브릭 G4 미달).
// VSM 맵은 .r에 평균 깊이를 이미 담고 있으므로 블로커 탐색을 그 값으로 바로 할 수 있다.
//   1) 블로커 탐색: 수신면보다 앞선 텍셀들의 평균 깊이 zb
//   2) 페넘브라 폭 = 광원 크기 × (zr - zb) / (1 - zr)   ← 원근 깊이에서 (dr-db)/db 근사
//   3) 그 폭으로 체비쇼프 VSM 테스트를 회전 보겔 디스크 샘플링
//
// 모듈 임포트 시점에 ShaderChunk를 교체한다. 프로그램 빌드 전이어야 하므로 pipeline이 import만 한다.

import * as THREE from 'three'

// 그림자 맵 uv 기준 광원 반경. 스콘스 0.06m 구·샹들리에 0.2m 디스크를 각 광원 프러스텀에
// 투영했을 때의 대표값이다. 값을 키우면 원거리 페넘브라가 넓어지고 접촉부는 그대로다.
const LIGHT_SIZE_UV = 0.016
const SEARCH_UV = 0.010
const MAX_PENUMBRA = 0.045

const PCSS = /* glsl */`

		const float PCSS_GA = 2.39996323;

		vec2 pcssDisk( int i, int n, float phi ) {
			float r = sqrt( ( float( i ) + 0.5 ) / float( n ) );
			float t = float( i ) * PCSS_GA + phi;
			return vec2( cos( t ), sin( t ) ) * r;
		}

		float pcssNoise( vec2 p ) {
			return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) );
		}

		float pcssTest( sampler2D shadowMap, vec2 uv, float z ) {
			vec2 dist = texture2D( shadowMap, uv ).rg;
			float mean = dist.x;
			float hard = step( z, mean );
			if ( hard == 1.0 ) return 1.0;
			float variance = max( dist.y * dist.y, 0.0000001 );
			float d = z - mean;
			float p = variance / ( variance + d * d );
			return clamp( ( p - 0.3 ) / 0.65, 0.0, 1.0 );
		}

		float getShadowPCSS( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {

			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;

			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			if ( ! ( inFrustum && shadowCoord.z <= 1.0 ) ) return 1.0;

			vec2 texel = vec2( 1.0 ) / shadowMapSize;
			float zr = shadowCoord.z;
			float phi = pcssNoise( gl_FragCoord.xy ) * 6.2831853;

			float sumB = 0.0;
			float cnt = 0.0;
			for ( int i = 0; i < 6; i ++ ) {
				vec2 uv = shadowCoord.xy + pcssDisk( i, 6, phi ) * ${SEARCH_UV.toFixed(4)};
				float m = texture2D( shadowMap, uv ).r;
				if ( m < zr - 0.0004 ) { sumB += m; cnt += 1.0; }
			}
			if ( cnt < 0.5 ) return 1.0;

			float zb = sumB / cnt;
			float ratio = max( zr - zb, 0.0 ) / max( 1.0 - zr, 0.02 );
			float pen = clamp( ${LIGHT_SIZE_UV.toFixed(4)} * ratio, texel.x * 1.5, ${MAX_PENUMBRA.toFixed(4)} );

			float sh = 0.0;
			for ( int i = 0; i < 10; i ++ ) {
				sh += pcssTest( shadowMap, shadowCoord.xy + pcssDisk( i, 10, phi ) * pen, zr );
			}
			sh *= 0.1;

			return mix( 1.0, sh, shadowIntensity );

		}
`

let applied = false

export function installPcss () {
  if (applied) return false
  const chunk = THREE.ShaderChunk.shadowmap_pars_fragment
  const marker = '#elif defined( SHADOWMAP_TYPE_VSM )'
  const mi = chunk.indexOf(marker)
  if (mi < 0) return false

  const sig = 'float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {'
  const si = chunk.indexOf(sig, mi)
  if (si < 0) return false

  const head = chunk.slice(0, mi + marker.length)
  const mid = chunk.slice(mi + marker.length, si + sig.length)
  const tail = chunk.slice(si + sig.length)

  // 원본 본문은 return 뒤로 밀려 도달 불가가 된다. 함수를 통째로 잘라내면 three가
  // 이 청크를 개정할 때 조용히 깨지므로, 진입점만 가로채는 편이 안전하다.
  THREE.ShaderChunk.shadowmap_pars_fragment = head + PCSS + mid +
    '\n\n\t\t\treturn getShadowPCSS( shadowMap, shadowMapSize, shadowIntensity, shadowBias, shadowRadius, shadowCoord );\n' +
    tail

  applied = true
  return true
}
