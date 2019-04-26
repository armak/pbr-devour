# Devour by Prismbeings
This is a 4 kilobyte executable procedural graphics entry for the Revision 2019 competition. It placed 2nd among other very high quality entries. It uses a modified version of my Leviathan framework (https://github.com/armak/Leviathan-2.0) with the guts replaced for still instead of realtime rendering.

Comment and binary downloads: https://www.pouet.net/prod.php?which=81043

The rendering method is a monte carlo path tracer by doing a one sample per pixel rendering via every draw call and blending it additively with the existing framebuffer until done. Nothing is shown while this is happening as it is denied by the compo rules (no animation or iterative rendering). There is also an "Accumulate" mode that shows the process. After a desired amount of samples has been rendered, it switches to a post processing pass that does averaging and tonemapping of the samples (and some other stuff). The post processing is static rendered once per frame from then on. The resulting executable should be about 3800 bytes (the shader code isn't optimized at all).

Result:
![Resulting render with about 1000 samples, I think](http://noby.untergrund.net/img/devour.png)

Acknowledgements:
- compressed with Crinkler 2.1a by Blueberry and Mentor of Loonies (http://www.crinkler.net/)
- shader minified (slightly) with Shader Minifier by LLB (https://github.com/laurentlb/Shader_Minifier)
- thanks to Fizzer for all sorts of help along the way 💛
- greetings to everyone who participated in the amazing compo!
