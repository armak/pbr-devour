#version 430

layout(location = 0) uniform int iFrame;
layout(binding = 0) uniform sampler2D imageTexture;
layout(location = 2) uniform vec2 resolution;

float gamma = 2.2;
vec3 tonemap(vec3 color){
	float A = 0.15;
	float B = 0.50;
	float C = 0.10;
	float D = 0.20;
	float E = 0.01;
	float F = 0.30;
	float W = 90.0;
	float exposure = 4.0;
	color *= exposure;
	color = ((color * (A * color + C * B) + D * E) / (color * (A * color + B) + D * F)) - E / F;
	float white = ((W * (A * W + C * B) + D * E) / (W * (A * W + B) + D * F)) - E / F;
	color /= white;
	
	return color;
}

const int N = 13;
vec3 ca(sampler2D t, vec2 UV){
	vec2 uv = 1.0 - 2.0 * UV;
	vec3 c = vec3(0);
	float rf = 1.0;
	float gf = 1.0;
    float bf = 1.0;
	float f = 1.0/float(N);
	for(int i = 0; i < N; ++i){
		c.r += f*texture(t, 0.5-0.5*(uv*rf) ).r;
		c.g += f*texture(t, 0.5-0.5*(uv*gf) ).g;
		c.b += f*texture(t, 0.5-0.5*(uv*bf) ).b;
		rf *= 0.99972;
		gf *= 0.9998;
        bf *= 0.99988;
	}
	return c;
}

vec3 source(vec2 coord){
    //vec4 fc = texelFetch(imageTexture, ivec2(coord), 0)/float(iFrame);
    vec3 fc = ca(imageTexture, coord/resolution.xy)/float(iFrame);
    
    // vignette
	vec2 uv = coord / resolution.xy;
    vec2 coord = (uv - 0.5) * (resolution.x/resolution.y) * 2.0;
	fc.rgb *= 1.0 / pow(0.09 * dot(coord, coord) + 1.0, 2.0);

    fc.rgb = tonemap(fc.rgb);
    fc.rgb = smoothstep(vec3(0), vec3(1), fc.rgb);
    return fc.rgb;
}

void main(){
    vec3 center = source(gl_FragCoord.xy + vec2( 0, 0));
    vec3 c = vec3(0);
    //c += source(fragCoord + vec2(-1,-1));
    //c += source(fragCoord + vec2( 1,-1));
    //c += source(fragCoord + vec2(-1, 1));
    //c += source(fragCoord + vec2( 1, 1));
    c += -1.0*source(gl_FragCoord.xy + vec2( 0,-1));
    c += -1.0*source(gl_FragCoord.xy + vec2(-1, 0));
    c +=  5.0*center;
    c += -1.0*source(gl_FragCoord.xy + vec2( 1, 0));
    c += -1.0*source(gl_FragCoord.xy + vec2( 0, 1));
    
    c = mix(center, c, 0.1);
    gl_FragColor.rgb = pow(c, vec3(1.0 / gamma));
}
