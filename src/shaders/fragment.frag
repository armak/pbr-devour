#version 430

layout(location = 0) uniform int iFrame;
layout(binding = 0) uniform sampler2D roughnessTexture;
layout(location = 2) uniform vec2 resolution;

const float pi = 3.1415926;
const float pi2 = 2.0*pi;

float maxcomp(vec3 p) { return max(p.x,max(p.y,p.z));}
vec4 mmin(vec4 a, vec4 b) { return a.x < b.x ? a : b; }
vec4 mmax(vec4 a, vec4 b) { return a.x > b.x ? a : b; }

float box(vec3 p, vec3 b){
	vec3  di = abs(p) - b;
	return maxcomp(di);
}

float hash13(vec3 p3){
    p3 = fract((p3)*0.1031);
    p3 += dot(p3, p3.yzx  + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

float seed;
float hash(){
	vec3 p3  = fract(vec3(seed++) * .1031);
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash(float p){
    vec3 p3 = fract(vec3(p)*vec3(.1031,.1030,.0973));
    p3 += dot(p3,p3.yzx+19.19);
    return fract((p3.xx+p3.yz)*p3.zy);
}

vec2 fc;
float sd;
/*
vec2 hash2(float n){
    vec2 rand = texelFetch(iChannel1, ivec2(mod(fc,1024.)),0).rg;
    rand += hash(sd+float(iFrame)+n);
    return mod(rand, 1.0);
}
*/
vec2 hash2(float n){return vec2(hash(), hash());}

const float phi = 1.324717957244746;
const float delta0 = 0.76;
const float i0 = 0.700;
const vec2 alpha = vec2(1.0/phi, 1.0/phi/phi);

float hash(uvec2 x){
    uvec2 q = 1103515245U * ( (x>>1U) ^ (x.yx   ) );
    uint  n = 1103515245U * ( (q.x  ) ^ (q.y>>3U) );
    return float(n) * (1.0/float(0xffffffffU));
}

vec2 hash22(vec2 p){vec3 p3 = fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3 += dot(p3,p3.yzx+19.19); return fract((p3.xx+p3.yz)*p3.zy);}

vec2 R2_seq(int i, float lambda, float n){
    vec2 u = vec2(hash(uvec2(i, 0)), hash(uvec2(i, 1)))-0.5;
    vec2 s = fract(alpha * float(i) + lambda * 1.347065 / (4.0 * sqrt(float(i) - i0)) * u);
    s += hash(n);
    s += hash22(fc);
	return mod(s, 1.0);
}

#define scale .7
#define maxi 0.75
#define fr_it 8
vec4 map(vec3 p){
    vec3 po = p;
    // need to flip this because ???
    p = -p;
    float k = 1.;
    float e = 0.0;
    for(int i = 0; i < fr_it; ++i){
        vec3 ss = vec3(-.54,0.84,1.22);
        p = 2.0*clamp(p,-ss,ss)-p;
        float f = max(scale/dot(p,p),maxi);
        p *= f;
        k *= f*1.05;
        e = f;
    }
    
    vec4 res = vec4(max(length(p.xz)-.9,length(p.xz)*abs(p.y)/length(p))/k, 3.0, 0.0, 1.0);
    
    // flip back because ???
    p = -p;

    // crumbly
    res.x += (-1.0+2.0*hash13( floor(p*10.0) ))*0.005 * (1.0-step(0.01, po.y));
    
    // glowy bits
    const float of = -1.0;
    const float l = 0.1;
    res.z = max(0.0, 60.0*(smoothstep(of-l,of,p.y)-smoothstep(of,of+l,p.x)));
    res.z *= step(-1.0, po.z);
    
    // res.yz += vec2(-3.0, 5.0)*( max(step(2.0, po.x), step(1.0, po.z)) );
    // blast
	const float ang = 0.04;
    const mat2 rot = mat2(cos(ang),sin(ang),-sin(ang),cos(ang));
    vec3 tpo = po-vec3(0,0.12,-1.5);
    tpo.xy *= rot;
    float blast = pow(smoothstep(-1.6, 0.35,po.x)-smoothstep(0.4,0.48,po.x), 3.0);
    res = mmin(res, vec4(length( (tpo).yz )-0.02*blast, 2, mix(0.0,25.0, pow(blast,2.0)), 0));
    
    // ground plane
    res = mmin(res, vec4( po.y+0.015, 0, 0, 0 ));

    // bounding box
    res = mmax(res, vec4(box(po, vec3(11,1.0,11)), 3, 0, 1));
    
    // medium light source (background)
    res = mmin(res, vec4(length(po-vec3(-2.4,0,-5))-0.4, vec3(0, 30, 0)));
    
    // huge light source (off camera)
    return mmin(res, vec4(length(po-vec3(-3.8,3.,-2.7))-2.4, vec3(1, 30, 0)));

}

const float E = 0.00025; //0.0002
vec4 intersect(vec3 ro, vec3 rd){
    float t = 0.0;
    vec4 res = vec4(-1.0);
	vec4 h = vec4(1.0);
    for(int i = 0; i < 200; i++){
        // dynamic epsilon, aka intersection exit-condition
        float eps = E + E*5.0*pow(float(i)/200.0,2.0);
		if(h.x < eps || t > 15.0)
            break;
        h = map(ro + rd*t);
        res = vec4(t,h.yzw);
        t += h.x;
    }
	
    // signal for no intersection and reached maximum distance
	return (t >= 15.0 ? vec4(-999) : res);
}

vec3 calcNormal(vec3 p){
    // basic central difference with 3 (4) samples
    // TODO: optimize the central sample away since it's available from callee always anyway
    float c = map(p).x;
    const float e = 0.00001;
    return normalize(vec3(c-map(p-vec3(e,0,0)).x, c-map(p-vec3(0,e,0)).x, c-map(p-vec3(0,0,e)).x));
}

vec3 lambert(in vec3 normal, in vec2 uv){
   float theta = pi2 * uv.x;
   uv.y = 2.0 * uv.y - 1.0;
   vec3 spherePoint = vec3(sqrt(1.0 - uv.y * uv.y) * vec2(cos(theta), sin(theta)), uv.y);
   return normalize(normal + spherePoint);
}

vec3 ggx(vec3 rd, vec3 n, float rgh, vec2 rand){
    float s  = -1 + 2 * step(0., n.z);
    float a  = -1 / (s+n.z);
    float b  = n.x * n.y * a;
    mat3  cs = mat3(vec3(1.+s*n.x*n.x*a,s*b,-s*n.x),n,vec3(b,s+n.y*n.y*a,-n.y));
    float th = 0.5*pi*atan((rgh*sqrt(rand.x))/sqrt(1.0-rand.x));
    
    vec3 reflection = normalize(transpose(cs)*rd);
    vec3 normal_distribution = vec3(cos(pi2 * rand.y)*sin(th), cos(th), sin(pi2 * rand.y)*sin(th));
    
    //normal_distribution.x *= 0.1;
    //normal_distribution = normalize(normal_distribution);
    
    return normalize(cs*reflect(reflection, normal_distribution));
}

vec3 brdf(in vec3 normal, in vec2 uv, in vec3 rd){
    // fizzer's strange but nice brdf
	float theta = pi2 * uv.x;
	uv.y = 2.0 * uv.y - 1.0;
	vec3 p = vec3(sqrt(1.0 - uv.y * uv.y) * vec2(cos(theta), sin(theta)), uv.y);
	float z=dot(p,normal);
	p-=z*normal;

	p/=sqrt(1.0-z*z);
	p*=(1.0-2.0*z+z*z)/4.0;
	p+=normal*sqrt(1.0-dot(p,p));

	vec3 ha=normalize(p);
	p=normalize(reflect(normalize(rd),p));

	return p;
}

vec3 colors[6];

vec3 render(vec3 ro, vec3 rd){

    vec3 color = vec3(0);
    vec3 absorption = vec3(1);
    const int bounces = 4;

    for(int b = 0; b < bounces; b++)
    {
        sd += 1.0;
        vec4 tmat = intersect(ro,rd);
        if(tmat.x >= 0.0)
        {
            vec3 pos = ro + tmat.x*rd;
            vec3 nor = calcNormal(pos);
            
            // fake texture coordinates for the metal parts
            // looks good enough from the camera position
            vec2 metal_coords = cross(nor, normalize(vec3(1,0,2)) ).xy;
            // get roughness map values
            float rough_map = mix(texture(roughnessTexture, mod(metal_coords*1.21,1.0)).r,
                                  texture(roughnessTexture, mod(metal_coords*0.53,1.0)).r, 0.7);
            rough_map = pow(1.0-rough_map,2.0);

            // incoming light value
            vec3 incoming = colors[int(tmat.y)];
            // modulate surface color (metal parts) with the roughmess map a bit
            incoming *= 1.0+0.09*(1.0-2.0*rough_map)*step(1.0, tmat.w);
            // emissive materials
            vec3 emission = tmat.z*incoming;
            
            // recursive color etc
            color += absorption * emission;
            // physical attenuation factor
            absorption *= incoming/pi;
            
            // calculate the brdf with magic formulas
            vec3 rv = reflect(rd, nor);
            float rough1 = 0.01+0.3*texture(roughnessTexture, mod(pos.xz*0.7,1.0)).r;
            rough1 = mix(rough1, 0.4, smoothstep(7.0,9.0,distance(ro,pos)));
            
            float rough2 = mix(0.04, 0.02+0.04*pow(1.0-rough_map,2.0), step(0.01,pos.y));
            
            vec3 metal  = mix(brdf(nor, R2_seq(iFrame, 0.5, 31.23+sd), rd), ggx(rd, nor, rough2, R2_seq(iFrame, 0.5, -43.531)), step(0.45,hash()));
            vec3 ground = mix(lambert(nor, R2_seq(iFrame, 0.5, 9531.5312+sd)), ggx(rd, nor, rough1, R2_seq(iFrame, 0.5, 86439.3)), step(0.5,hash()));
            rd = mix(ground, metal, tmat.w);
            // fresnel doesn't look so good here, honestly
            //float fresnel = pow(max(0., dot(nor, rd)), 5.);
            //rd = mix(rd, rv, 1.0-step(fresnel, hash()));
            
            // new origin position, offset away from the surface to prevent self-intersection
            ro = pos+rd*E*20.0;
        } else {
            // no intersection, currently actually doesn't doo much of anything...
            vec3 pos = ro + tmat.x*rd;
            color += absorption * colors[4]*0.9;
            break;
        }
    }
    
    return color;
}

void main(){
    // fill global color values
	colors[0] = 1.25*vec3(0.75,0.52,0.4).bgr;
    colors[1] = 1.25*vec3(0.75,0.38,0.2).bgr;
    colors[2] = vec3(0.6,0.32,0.92).bgr;
    colors[3] = vec3(0.42,0.66,0.95).bgr;
    colors[4] = normalize(vec3(3.0,1.0,0.5)).bgr;
    colors[5] = vec3(1.0, 0.1 ,0.04).bgr;
    fc = gl_FragCoord.xy;
    seed = float(((iFrame*73856093)^int(gl_FragCoord.x)*19349663^int(gl_FragCoord.y)*83492791)%38069);

    const float aspect = resolution.x/resolution.y;
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 ro = vec3(.6,.1,.7)*20.0;
    
    vec3 col = vec3(0.0);
    // we only do one sample in this version, the loop is redundant
    ///const int samples = 1;
    //for(int s = 0; s < samples; s++){

        // calculate camera/view orientation
        vec3 ww = normalize(vec3(0.76,0.38,0.1)-ro);
		vec3 uu = normalize(cross(normalize(vec3(0,1,0)),ww));
		vec3 vv = normalize(cross(ww,uu));
        
        //vec2 rand = R2_seq(iFrame, 1.0, -10.0);
        vec2 rand = hash2(0.0);
        
        // anti aliasing samples
        vec2 p = -1.0 + 2.0 * (uv + 0.667*(-1.0+2.0*hash2(3531.412))/resolution.xy);
        p.x *= aspect;
        
        // lens samples...
        vec2 lens_sample = vec2(cos(rand.x*pi2),sin(rand.x*pi2))*pow(rand.y, 0.32);
        // anamorphic stretch
        lens_sample *= vec2(0.75, 1.333);
        // re-calculate view vectors based on the lens samples
        const float depth_of_field = 0.1;
        const float fov_length = 40.0;
        const float focus_distance = 0.45;
        vec3 lens_pos = ro + (lens_sample.x*uu + lens_sample.y*vv) * depth_of_field;
        vec3 vr = normalize(ro+(p.x*uu + p.y*vv + fov_length*ww) * focus_distance-lens_pos);

        // render/sample the scene
        // offset the origin with a magic number (a "near plane")
        // the result is clamped a bit to make it visually more pleasant
        gl_FragColor.rgb = min(render(lens_pos+17.3*vr, vr), 15.0);
    //}
}
