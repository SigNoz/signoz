import { vendorChunkName } from '../vendorChunkName';

describe('vendorChunkName', () => {
	it('names an unscoped package after its folder', () => {
		expect(
			vendorChunkName('/repo/node_modules/react-dom/cjs/react-dom.production.js'),
		).toBe('v-react-dom');
	});

	it('joins the scope and the name of a scoped package', () => {
		expect(
			vendorChunkName(
				'/repo/node_modules/@tanstack/react-table/build/lib/index.mjs',
			),
		).toBe('v--tanstack-react-table');
	});

	it('uses the innermost node_modules of a pnpm path', () => {
		expect(
			vendorChunkName(
				'/repo/node_modules/.pnpm/antd@5.0.0_react@18/node_modules/antd/es/index.js',
			),
		).toBe('v-antd');
	});

	it('returns null for app code and virtual modules', () => {
		expect(vendorChunkName('/repo/src/pages/Home/index.tsx')).toBeNull();
		expect(vendorChunkName('\0vite/preload-helper.js')).toBeNull();
	});

	it('replaces characters that are not safe in a file name', () => {
		expect(vendorChunkName('/repo/node_modules/@scope/a+b/index.js')).toBe(
			'v--scope-a-b',
		);
	});
});
