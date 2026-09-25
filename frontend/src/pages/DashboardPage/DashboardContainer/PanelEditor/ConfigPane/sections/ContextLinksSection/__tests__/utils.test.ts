import {
	getUrlParams,
	insertVariableAtCursor,
	isValidContextLinkUrl,
	updateUrlWithParams,
} from '../utils';

describe('ContextLinksSection utils', () => {
	describe('isValidContextLinkUrl', () => {
		it.each([
			['', true],
			['https://signoz.io', true],
			['http://localhost:3301/trace', true],
			['/trace/{{_traceId}}', true],
			['{{host}}/trace', true],
			['trace/{{_traceId}}', false],
			['ftp://signoz.io', false],
		])('validates %p as %p', (url, expected) => {
			expect(isValidContextLinkUrl(url)).toBe(expected);
		});
	});

	describe('insertVariableAtCursor', () => {
		it('inserts at the cursor position', () => {
			expect(insertVariableAtCursor('/trace/', '{{id}}', 7)).toBe('/trace/{{id}}');
			expect(insertVariableAtCursor('ab', '{{x}}', 1)).toBe('a{{x}}b');
		});

		it('appends when no cursor position is given', () => {
			expect(insertVariableAtCursor('/trace/', '{{id}}')).toBe('/trace/{{id}}');
		});
	});

	describe('getUrlParams', () => {
		it('returns [] when there is no query string', () => {
			expect(getUrlParams('/trace/{{id}}')).toStrictEqual([]);
		});

		it('parses and decodes key/value pairs', () => {
			expect(getUrlParams('/logs?service={{svc}}&env=prod')).toStrictEqual([
				{ key: 'service', value: '{{svc}}' },
				{ key: 'env', value: 'prod' },
			]);
		});

		it('double-decodes over-encoded values', () => {
			// %257B%257B == encodeURIComponent('%7B%7B') == encodeURIComponent('{{')
			expect(getUrlParams('/logs?q=%257B%257Bx%257D%257D')).toStrictEqual([
				{ key: 'q', value: '{{x}}' },
			]);
		});

		it('treats undecodable percent sequences as literal text instead of throwing', () => {
			expect(getUrlParams('/logs?search=95%')).toStrictEqual([
				{ key: 'search', value: '95%' },
			]);
			expect(getUrlParams('/logs?95%=value')).toStrictEqual([
				{ key: '95%', value: 'value' },
			]);
		});

		it('decodes a valid escape once even when the result has a stray percent', () => {
			// %2525 double-decodes to '%'; 95%25 decodes once to '95%' and stops there
			expect(getUrlParams('/logs?a=95%25&b=%2525')).toStrictEqual([
				{ key: 'a', value: '95%' },
				{ key: 'b', value: '%' },
			]);
		});
	});

	describe('updateUrlWithParams', () => {
		it('rebuilds the query string and drops empty keys', () => {
			expect(
				updateUrlWithParams('/logs?old=1', [
					{ key: 'service', value: '{{svc}}' },
					{ key: '', value: 'ignored' },
				]),
			).toBe('/logs?service=%7B%7Bsvc%7D%7D');
		});

		it('drops the query string entirely when no valid params remain', () => {
			expect(updateUrlWithParams('/logs?a=b', [])).toBe('/logs');
		});
	});
});
