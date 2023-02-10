import { selectedGroupByValue } from './utils';

const options = [
	{
		value: '1',
		label: '1',
	},
	{
		value: '2',
		label: '2',
	},
];

describe('TraceGraphFilter/utils', () => {
	it('should return the correct value', () => {
		const selectedGroupBy = '1';
		const result = selectedGroupByValue(selectedGroupBy, options);
		expect(result).toEqual(selectedGroupBy);
	});

	it('should return the correct value when selectedOption not found', () => {
		const selectedGroupBy = '3';

		const result = selectedGroupByValue(selectedGroupBy, options);
		expect(result).toEqual(selectedGroupBy);
	});
});
