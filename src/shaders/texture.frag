#version 430
layout(location = 0) uniform vec2 resolution;

void main(){
	vec2 s = 15.8*(gl_FragCoord.xy/resolution.xy);
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
    
    gl_FragColor = pow(1.0-smoothstep(0.4,1.05, gl_FragColor*0.09), vec4(1.25));
}