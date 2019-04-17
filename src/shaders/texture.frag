#version 430
layout(location = 0) uniform vec2 resolution;

vec4 hash42(vec2 p){
    vec4 p4 = fract(vec4(p.xyxy)*vec4(1031,.1030,.0973,.1099));
    p4 += dot(p4,p4.wzxy+19.19);
    return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}

float orbitnoise(vec2 p){
    vec2 ip = floor(p);
    vec2 fp = fract(p) - 0.5;
    float rz = 0.;
    float orbitRadius = 0.5;//smoothstep(-0.5,0.4,0.0)*1.3;
    for (int j = -2; j <= 2; j++){
        for (int i = -2; i <= 2; i++){
            vec2 dp = vec2(j,i);
            vec4 rn = hash42(dp + ip) - 0.5;
            vec2 op = fp - dp - rn.zw*orbitRadius;
            rz += smoothstep(1.4, float(0), length(op))*dot(rn.xy*1.4, op);
        }
    }
    
    return rz*0.5 + 0.5;
}

void main(){
	vec2 s = 15.8*(gl_FragCoord.xy/resolution.xx);
	float r = 0.0;
	gl_FragColor = vec4(0);
    for(int g = 0; g < 5; g++){
		r += .45*sin(1.63*s.x)*sin(1.5*s.y);
		s  = mat2(.8,.61,-.6,.8)*s*2.002;
        r += .25*sin(1.5*s.x)*sin(1.5*s.y);
        s  = mat2(.7,.62,-.59,.8)*s*2.003;
        r += .125*sin(1.5*s.x)*sin(1.5*s.y);
        s  = mat2(.8,.7,-.6,.8)*s*2.001;
        r += .0625*sin(1.5*s.x)*sin(1.5*s.y);
        
        gl_FragColor += 0.9+r/.7;
        s = gl_FragColor.xx;
    }

    gl_FragColor.x = pow(1.0-smoothstep(0.4,1.05, gl_FragColor.x*0.09), 1.25);

    float n = 120000000.0;
    for(int i = 0; i < 7; ++i){
        float f = pow(2.0, float(1+i));
        n *= 0.02+0.98*orbitnoise(s*f*0.125)/f;
    }

    gl_FragColor.b = smoothstep(0.01, 1.25, n);
}