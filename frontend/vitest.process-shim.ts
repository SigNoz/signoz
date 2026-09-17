// Application code still reads build-time values off `process.env`, which the
// app's vite config replaces through `define`. jsdom inherits node's `process`,
// a real browser has none, so give browser mode an empty environment to read.
// Imported first so it lands before any module that reads it.
if (typeof globalThis.process === 'undefined') {
	(globalThis as { process?: unknown }).process = { env: { NODE_ENV: 'test' } };
}

export {};
