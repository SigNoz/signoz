import { IDashboardVariable } from 'types/api/dashboard/getAll';

import { normalizeUrlValueForVariable } from '../normalizeUrlValue';

// Mock variable configurations
const singleSelectVariable: Partial<IDashboardVariable> = {
	id: 'env',
	name: 'environment',
	multiSelect: false,
};

const multiSelectVariable: Partial<IDashboardVariable> = {
	id: 'services',
	name: 'service_names',
	multiSelect: true,
};

describe('normalizeUrlValueForVariable', () => {
	describe('Single select variable', () => {
		it('should keep single string value as is', () => {
			const result = normalizeUrlValueForVariable(
				'production',
				singleSelectVariable as IDashboardVariable,
			);
			expect(result).toBe('production');
		});

		it('should keep single number value as is', () => {
			const result = normalizeUrlValueForVariable(
				123,
				singleSelectVariable as IDashboardVariable,
			);
			expect(result).toBe(123);
		});

		it('should take first element from array', () => {
			const result = normalizeUrlValueForVariable(
				['production', 'staging'],
				singleSelectVariable as IDashboardVariable,
			);
			expect(result).toBe('production');
		});

		it('should return null for empty array', () => {
			const result = normalizeUrlValueForVariable(
				[],
				singleSelectVariable as IDashboardVariable,
			);
			expect(result).toBeNull();
		});

		it('should handle null/undefined values', () => {
			expect(
				normalizeUrlValueForVariable(
					null,
					singleSelectVariable as IDashboardVariable,
				),
			).toBeNull();
			expect(
				normalizeUrlValueForVariable(
					undefined,
					singleSelectVariable as IDashboardVariable,
				),
			).toBeUndefined();
		});
	});

	describe('Multi select variable', () => {
		it('should convert string to array', () => {
			const result = normalizeUrlValueForVariable(
				'production',
				multiSelectVariable as IDashboardVariable,
			);
			expect(result).toStrictEqual(['production']);
		});

		it('should convert number to array', () => {
			const result = normalizeUrlValueForVariable(
				123,
				multiSelectVariable as IDashboardVariable,
			);
			expect(result).toStrictEqual([123]);
		});

		it('should keep array as is', () => {
			const result = normalizeUrlValueForVariable(
				['production', 'staging'],
				multiSelectVariable as IDashboardVariable,
			);
			expect(result).toStrictEqual(['production', 'staging']);
		});

		it('should keep empty array as is', () => {
			const result = normalizeUrlValueForVariable(
				[],
				multiSelectVariable as IDashboardVariable,
			);
			expect(result).toStrictEqual([]);
		});

		it('should handle null/undefined values', () => {
			expect(
				normalizeUrlValueForVariable(
					null,
					multiSelectVariable as IDashboardVariable,
				),
			).toBeNull();
			expect(
				normalizeUrlValueForVariable(
					undefined,
					multiSelectVariable as IDashboardVariable,
				),
			).toBeUndefined();
		});
	});

	describe('Real world scenarios', () => {
		it('URL has array ["test", "prod"] for single select variable -> should take "test"', () => {
			const result = normalizeUrlValueForVariable(
				['test', 'prod'],
				singleSelectVariable as IDashboardVariable,
			);
			expect(result).toBe('test');
		});

		it('URL has string "test" for multi select variable -> should convert to ["test"]', () => {
			const result = normalizeUrlValueForVariable(
				'test',
				multiSelectVariable as IDashboardVariable,
			);
			expect(result).toStrictEqual(['test']);
		});

		it('Handles mixed types in array for single select', () => {
			const result = normalizeUrlValueForVariable(
				['test', 123, true],
				singleSelectVariable as IDashboardVariable,
			);
			expect(result).toBe('test');
		});
	});
});
