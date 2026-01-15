import { areArraysEqual } from './util';

describe('areArraysEqual', () => {
	it('should return true for equal arrays with same order', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = [1, 'a', true, 5, 'hello'];
		expect(areArraysEqual(array1, array2)).toBe(true);
	});

	it('should return false for equal arrays with different order', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = ['hello', 1, true, 'a', 5];
		expect(areArraysEqual(array1, array2)).toBe(false);
	});

	it('should return false for arrays with different lengths', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = [1, 'a', true, 5];
		expect(areArraysEqual(array1, array2)).toBe(false);
	});

	it('should return false for arrays with different elements', () => {
		const array1 = [1, 'a', true, 5, 'hello'];
		const array2 = [1, 'a', true, 5, 'world'];
		expect(areArraysEqual(array1, array2)).toBe(false);
	});

	it('should return true for empty arrays', () => {
		const array1: string[] = [];
		const array2: string[] = [];
		expect(areArraysEqual(array1, array2)).toBe(true);
	});
});
