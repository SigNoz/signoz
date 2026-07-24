import { prioritizeOrAddOptionForMultiSelect } from '../utils';

describe('prioritizeOrAddOptionForMultiSelect ordering', () => {
	it('hoists selected then preserves the given (sorted) order in each group', () => {
		const sorted = ['apple', 'banana', 'cherry', 'date', 'elderberry'].map(
			(v) => ({ label: v, value: v }),
		);
		// selection given in a non-sorted order on purpose
		const result = prioritizeOrAddOptionForMultiSelect(sorted, [
			'date',
			'banana',
		]);
		expect(result.map((o) => o.value)).toStrictEqual([
			'banana',
			'date',
			'apple',
			'cherry',
			'elderberry',
		]);
	});
});
