#pragma data_seg(".shader")
const char* texture =
 "#version 430\n"
 "layout(location=0)uniform vec2 r;"
 "void main()"
 "{"
   "vec2 s=15.8*(gl_FragCoord.xy/r.xy);"
   "float g=0;"
   "gl_FragColor=vec4(0);"
   "for(int v=0;v<5;v++)"
     "g+=.45*sin(1.63*s.x)*sin(1.5*s.y),s=mat2(.8,.61,-.6,.8)*s*2.002,g+=.25*sin(1.5*s.x)*sin(1.5*s.y),s=mat2(.7,.62,-.59,.8)*s*2.003,g+=.125*sin(1.5*s.x)*sin(1.5*s.y),s=mat2(.8,.7,-.6,.8)*s*2.001,g+=.0625*sin(1.5*s.x)*sin(1.5*s.y),gl_FragColor+=.9+g/.7,s=gl_FragColor.xx;"
   "gl_FragColor=pow(1-smoothstep(.4,1.05,gl_FragColor*.09),vec4(1.25));"
 "}";
