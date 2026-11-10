// Test stub for the Vite-only icon glob module: `import.meta.glob` can't be
// parsed by jest, so every test that transitively imports it is redirected here
// (see moduleNameMapper in jest.config.ts). Provides a minimal name → URL map so
// the resolver stays deterministic under test.
export const ICON_URLS: Record<string, string> = {
	'eight-ball': 'mock-eight-ball-url',
};

export const LOGO_URLS: Record<string, string> = {
	'aws-dark': 'mock-logo-url',
};
