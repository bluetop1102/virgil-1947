import{n as e}from"./three.module-BfmM4iuI.js";var t=`

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
				vec2 uv = shadowCoord.xy + pcssDisk( i, 6, phi ) * ${.01.toFixed(4)};
				float m = texture2D( shadowMap, uv ).r;
				if ( m < zr - 0.0004 ) { sumB += m; cnt += 1.0; }
			}
			if ( cnt < 0.5 ) return 1.0;

			float zb = sumB / cnt;
			float ratio = max( zr - zb, 0.0 ) / max( 1.0 - zr, 0.02 );
			float pen = clamp( ${.016.toFixed(4)} * ratio, texel.x * 1.5, ${.045.toFixed(4)} );

			float sh = 0.0;
			for ( int i = 0; i < 10; i ++ ) {
				sh += pcssTest( shadowMap, shadowCoord.xy + pcssDisk( i, 10, phi ) * pen, zr );
			}
			sh *= 0.1;

			return mix( 1.0, sh, shadowIntensity );

		}
`,n=!1;function r(){if(n)return!1;let r=e.shadowmap_pars_fragment,i=r.indexOf(`#elif defined( SHADOWMAP_TYPE_VSM )`);if(i<0)return!1;let a=r.indexOf(`float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {`,i);if(a<0)return!1;let o=r.slice(0,i+35),s=r.slice(i+35,a+139),c=r.slice(a+139);return e.shadowmap_pars_fragment=o+t+s+`

			return getShadowPCSS( shadowMap, shadowMapSize, shadowIntensity, shadowBias, shadowRadius, shadowCoord );
`+c,n=!0,!0}export{r as t};