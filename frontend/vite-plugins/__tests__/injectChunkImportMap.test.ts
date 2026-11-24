import { injectChunkImportMap } from '../injectChunkImportMap';

describe('injectChunkImportMap', () => {
	it('runs after the plugins that write index.html and the import map', () => {
		const hook = injectChunkImportMap().generateBundle;

		expect(hook).toMatchObject({ order: 'post' });
	});
});
