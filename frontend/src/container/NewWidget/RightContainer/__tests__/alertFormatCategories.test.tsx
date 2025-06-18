import { Y_AXIS_CATEGORIES } from 'components/YAxisUnitSelector/constants';

import {
	alertsCategory,
	getCategoryByOptionId,
	getCategorySelectOptionByName,
} from '../alertFomatCategories';
import { CategoryNames, DataRateFormats, MiscellaneousFormats } from '../types';

describe('getCategorySelectOptionByName', () => {
	it('should return empty array for undefined category name', () => {
		const result = getCategorySelectOptionByName(undefined);
		expect(result).toEqual([]);
	});

	it('should return empty array for invalid category name', () => {
		const result = getCategorySelectOptionByName('invalid_category');
		expect(result).toEqual([]);
	});

	it('should return correct options for legacy Data Rate category', () => {
		const result = getCategorySelectOptionByName(CategoryNames.DataRate);
		expect(result).toEqual(
			alertsCategory
				.find((category) => category.name === CategoryNames.DataRate)
				?.formats.map((format) => ({
					label: format.name,
					value: format.id,
				})),
		);
	});

	it('should return correct options for legacy Miscellaneous category', () => {
		const result = getCategorySelectOptionByName(CategoryNames.Miscellaneous);
		expect(result).toContainEqual({
			label: 'Percent (0 - 100)',
			value: MiscellaneousFormats.Percent,
		});
	});
});

describe('getCategoryByOptionId', () => {
	it('should return undefined for invalid option id', () => {
		const result = getCategoryByOptionId('invalid_id');
		expect(result).toBeUndefined();
	});

	it('should return correct category for legacy Data Rate format id', () => {
		const result = getCategoryByOptionId(DataRateFormats.BytesPerSecSI);
		expect(result?.name).toBe(CategoryNames.DataRate);
	});

	it('should return correct category for legacy Miscellaneous format id', () => {
		const result = getCategoryByOptionId(MiscellaneousFormats.Percent);
		expect(result?.name).toBe(CategoryNames.Miscellaneous);
	});

	it('should return correct category for new Y axis unit id', () => {
		const testCategory = Y_AXIS_CATEGORIES[0];
		const testUnit = testCategory.units[0];
		const result = getCategoryByOptionId(testUnit.id);
		expect(result).toEqual({
			name: testCategory.name,
			formats: alertsCategory
				.find((category) => category.name === testCategory.name)
				?.formats.map((format) => ({
					name: format.name,
					id: format.id,
				})),
		});
	});
});
