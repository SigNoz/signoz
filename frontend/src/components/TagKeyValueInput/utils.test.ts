import { parseKeyValueTag } from './utils';

describe('parseKeyValueTag', () => {
	it('normalizes a valid key:value pair', () => {
		expect(parseKeyValueTag('env:prod')).toBe('env:prod');
	});

	it('trims whitespace around key and value', () => {
		expect(parseKeyValueTag('  env :  prod ')).toBe('env:prod');
	});

	it('keeps colons inside the value', () => {
		expect(parseKeyValueTag('url:http://x')).toBe('url:http://x');
	});

	it('rejects a bare value with no colon', () => {
		expect(parseKeyValueTag('prod')).toBeNull();
	});

	it('rejects an empty key', () => {
		expect(parseKeyValueTag(':prod')).toBeNull();
	});

	it('rejects an empty value', () => {
		expect(parseKeyValueTag('env:')).toBeNull();
	});

	it('rejects blank input', () => {
		expect(parseKeyValueTag('   ')).toBeNull();
	});
});
