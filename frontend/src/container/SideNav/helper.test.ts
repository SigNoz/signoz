import { getQueryString } from './helper';

describe('getQueryString', () => {
	it('returns an array of query strings for given available parameters and URLSearchParams', () => {
		const availableParams = ['param1', 'param2', 'param3'];
		const params = new URLSearchParams(
			'param1=value1&param2=value2&param4=value4',
		);

		const result = getQueryString(availableParams, params);

		expect(result).toEqual(['param1=value1', 'param2=value2', '']);
	});

	it('returns an array of empty strings if no matching parameters are found', () => {
		const availableParams = ['param1', 'param2', 'param3'];
		const params = new URLSearchParams('param4=value4&param5=value5');

		const result = getQueryString(availableParams, params);

		expect(result).toEqual(['', '', '']);
	});

	it('returns an empty array if the available parameters list is empty', () => {
		const availableParams: string[] = [];
		const params = new URLSearchParams(
			'param1=value1&param2=value2&param3=value3',
		);

		const result = getQueryString(availableParams, params);

		expect(result).toEqual([]);
	});
});
