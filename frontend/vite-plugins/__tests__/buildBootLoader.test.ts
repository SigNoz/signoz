import { buildBootLoader } from '../buildBootLoader';

describe('buildBootLoader', () => {
	it('escapes < so a chunk name cannot close the script', () => {
		const loader = buildBootLoader('{"imports":{"a":"</script>.js"}}', './a.js');
		const script = loader.slice(0, loader.indexOf('</script>'));

		expect(script).toContain('\\u003c/script>');
		expect(loader.match(/<\/script>/g)).toHaveLength(1);
	});

	it('preloads the entry next to the script', () => {
		const loader = buildBootLoader('{"imports":{}}', './assets/index-CCCC.js');

		expect(loader).toMatch(
			/<\/script><link rel="modulepreload" crossorigin href="\.\/assets\/index-CCCC\.js">$/,
		);
	});
});
