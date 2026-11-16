let supported: boolean | undefined;

function probe(): boolean {
	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
		// Browsers cap live contexts, so the probe's is released at once.
		gl?.getExtension('WEBGL_lose_context')?.loseContext();
		return Boolean(gl);
	} catch {
		return false;
	}
}

/** Whether this browser can draw the WebGL points layer. */
export function supportsWebGL(): boolean {
	supported ??= probe();
	return supported;
}
