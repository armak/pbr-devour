// custom build and feature flags
#ifdef DEBUG
	#define OPENGL_DEBUG        0
	#define FULLSCREEN          0
	#define DESPERATE           0
	#define BREAK_COMPATIBILITY 0
#else
	#define OPENGL_DEBUG        0
	#define FULLSCREEN          1
	#define DESPERATE           0
	#define BREAK_COMPATIBILITY 0
#endif

#define ACCUMULATE 0

#include "definitions.h"
#include "glext.h"
#include "shaders/texture.inl"
#include "shaders/fragment.inl"
#include "shaders/post.inl"

#include "timeapi.h"

#pragma data_seg(".pids")
// static allocation saves a few bytes
static int pidTexture;
static int pidMain;
static int pidPost;
// static HDC hDC;

#ifndef EDITOR_CONTROLS
#pragma code_seg(".main")
void entrypoint(void)
#else
#include "editor.h"
#include "song.h"
int __cdecl main(int argc, char* argv[])
#endif
{
	// initialize window
	#if FULLSCREEN
		ChangeDisplaySettings(&screenSettings, CDS_FULLSCREEN);
		ShowCursor(0);
		const HDC hDC = GetDC(CreateWindow((LPCSTR)0xC018, 0, WS_POPUP | WS_VISIBLE | WS_MAXIMIZE, 0, 0, 0, 0, 0, 0, 0, 0));
	#else
		#ifdef EDITOR_CONTROLS
			HWND window = CreateWindow("static", 0, WS_POPUP | WS_VISIBLE, 0, 0, XRES, YRES, 0, 0, 0, 0);
			HDC hDC = GetDC(window);
		#else
			HDC hDC = GetDC(CreateWindow((LPCSTR)0xC018, 0, WS_POPUP | WS_VISIBLE, 0, 0, XRES, YRES, 0, 0, 0, 0));
		#endif
	#endif

	// initalize opengl context
	SetPixelFormat(hDC, ChoosePixelFormat(hDC, &pfd), &pfd);
	wglMakeCurrent(hDC, wglCreateContext(hDC));
	
	// create and compile shader programs
	pidTexture = ((PFNGLCREATESHADERPROGRAMVPROC)wglGetProcAddress("glCreateShaderProgramv"))(GL_FRAGMENT_SHADER, 1, &texture);
	pidMain    = ((PFNGLCREATESHADERPROGRAMVPROC)wglGetProcAddress("glCreateShaderProgramv"))(GL_FRAGMENT_SHADER, 1, &fragment);
	pidPost    = ((PFNGLCREATESHADERPROGRAMVPROC)wglGetProcAddress("glCreateShaderProgramv"))(GL_FRAGMENT_SHADER, 1, &post);

#ifndef EDITOR_CONTROLS
#else
	Leviathan::Editor editor = Leviathan::Editor();
	
	editor.compileAndDebugShader(texture, "texture", false);
	editor.compileAndDebugShader(fragment, "fragment", false);
	editor.compileAndDebugShader(post, "texture", false);
	
	editor.updateShaders(&pidMain, &pidPost, true);
#endif

	// texture for roughness map
	GLuint roughnessTexture = 0;
	glGenTextures(1, &roughnessTexture);
	glBindTexture(GL_TEXTURE_2D, roughnessTexture);
	// parameters
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
	// render the roughness map to the texture
	((PFNGLUSEPROGRAMPROC)wglGetProcAddress("glUseProgram"))(pidTexture);
	((PFNGLUNIFORM2FPROC)wglGetProcAddress("glUniform2f"))(0, XRES, YRES);
	glRects(-1, -1, 1, 1);
	glReadBuffer(GL_BACK);
	glCopyTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, 0, 0, YRES, YRES, 0);
	glClearColor(0.0f, 0.0f, 0.0f, 0.0f);
	glClear(GL_COLOR_BUFFER_BIT);
	

	// main rendering texture (for accumulating values)
	GLuint mainTexture = 0;
	glGenTextures(1, &mainTexture);
	glBindTexture(GL_TEXTURE_2D, mainTexture);
	// parameters
	glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA32F, XRES, YRES, 0, GL_RGBA, GL_FLOAT, 0);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
	// framebuffer
	GLuint framebuffer = 0;
	((PFNGLGENFRAMEBUFFERSPROC)wglGetProcAddress("glGenFramebuffers"))(1, &framebuffer);
	((PFNGLBINDFRAMEBUFFERPROC)wglGetProcAddress("glBindFramebuffer"))(GL_FRAMEBUFFER, framebuffer);
	((PFNGLBINDFRAMEBUFFERPROC)wglGetProcAddress("glBindFramebuffer"))(GL_DRAW_FRAMEBUFFER, framebuffer);
	((PFNGLFRAMEBUFFERTEXTURE2DPROC)wglGetProcAddress("glFramebufferTexture2D"))(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, mainTexture, 0);
	
	const GLenum attachments[] = { GL_COLOR_ATTACHMENT0 };
	((PFNGLDRAWBUFFERSPROC)wglGetProcAddress("glDrawBuffers"))(1, attachments);

	glClearColor(0.0f, 0.0f, 0.0f, 0.0f);
	glClear(GL_COLOR_BUFFER_BIT);

	// enable blending for accumulating the values over frames
	glEnable(GL_BLEND);
	glBlendFunc(GL_ONE, GL_ONE);

	// main loop
	const unsigned long samples = 750;
	unsigned long frame = 1;
	glBindTexture(GL_TEXTURE_2D, roughnessTexture);

	const int t = timeGetTime();
	bool done = false;

	do
	{
#if !(DESPERATE)
		PeekMessage(0, 0, 0, 0, PM_REMOVE);
#endif

#if ACCUMULATE
		// present the result immediately and render iteratively
		// not allowed in the compo, just for debugging
		glEnable(GL_BLEND);
		((PFNGLBINDFRAMEBUFFERPROC)wglGetProcAddress("glBindFramebuffer"))(GL_DRAW_FRAMEBUFFER, framebuffer);
		const GLenum attachments[] = { GL_COLOR_ATTACHMENT0 };
		((PFNGLDRAWBUFFERSPROC)wglGetProcAddress("glDrawBuffers"))(1, attachments);
		glBindTexture(GL_TEXTURE_2D, roughnessTexture);
		((PFNGLUSEPROGRAMPROC)wglGetProcAddress("glUseProgram"))(pidMain);
		((PFNGLUNIFORM1IPROC)wglGetProcAddress("glUniform1i"))(0, frame);
		((PFNGLUNIFORM2FPROC)wglGetProcAddress("glUniform2f"))(2, XRES, YRES);
		glRects(-1, -1, 1, 1);

		frame += 1;

		glBindTexture(GL_TEXTURE_2D, mainTexture);
		((PFNGLBINDFRAMEBUFFERPROC)wglGetProcAddress("glBindFramebuffer"))(GL_DRAW_FRAMEBUFFER, 0);
		glDrawBuffer(GL_BACK);
		((PFNGLUSEPROGRAMPROC)wglGetProcAddress("glUseProgram"))(pidPost);
		((PFNGLUNIFORM1IPROC)wglGetProcAddress("glUniform1i"))(0, frame);
		((PFNGLUNIFORM2FPROC)wglGetProcAddress("glUniform2f"))(2, XRES, YRES);
		glDisable(GL_BLEND);
		glRects(-1, -1, 1, 1);
#else
		// time based accumulation
		//if (timeGetTime()-t < 30*1000)
		// render and accumulate N amount of samples
		if (frame < samples)
		{
			((PFNGLUSEPROGRAMPROC)wglGetProcAddress("glUseProgram"))(pidMain);
			((PFNGLUNIFORM1IPROC)wglGetProcAddress("glUniform1i"))(0, frame);
			((PFNGLUNIFORM2FPROC)wglGetProcAddress("glUniform2f"))(2, XRES, YRES);
			glRects(-1, -1, 1, 1);

			frame += 1;
		}
		// after rendering the desired amount, present the result and render post processing
		// includes averaging the samples, tonemapping and more
		else
		{
			/*
			if (!done) {
				printf("Samples: %d\n", frame);
				done = true;
			}
			*/

			glBindTexture(GL_TEXTURE_2D, mainTexture);
			((PFNGLBINDFRAMEBUFFERPROC)wglGetProcAddress("glBindFramebuffer"))(GL_DRAW_FRAMEBUFFER, 0);
			glDrawBuffer(GL_BACK);
			((PFNGLUSEPROGRAMPROC)wglGetProcAddress("glUseProgram"))(pidPost);
			((PFNGLUNIFORM1IPROC)wglGetProcAddress("glUniform1i"))(0, frame);
			((PFNGLUNIFORM2FPROC)wglGetProcAddress("glUniform2f"))(2, XRES, YRES);
			glDisable(GL_BLEND);
			glRects(-1, -1, 1, 1);
		}
#endif

		SwapBuffers(hDC);
	}
	while(!GetAsyncKeyState(VK_ESCAPE));

	ExitProcess(0);
}
