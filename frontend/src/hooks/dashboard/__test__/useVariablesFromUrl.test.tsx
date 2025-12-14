import { act, renderHook } from '@testing-library/react';
import { QueryParams } from 'constants/query';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import useVariablesFromUrl, {
	LocalStoreDashboardVariables,
} from '../useVariablesFromUrl';

describe('useVariablesFromUrl', () => {
	it('should initialize with empty variables when no URL params exist', () => {
		const history = createMemoryHistory({
			initialEntries: ['/'],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		expect(result.current.getUrlVariables()).toEqual({});
	});

	it('should correctly parse variables from URL', () => {
		const mockVariables = {
			var1: 'value1',
			var2: ['value2', 'value3'],
			var3: 123,
		};

		const encodedVariables = encodeURIComponent(JSON.stringify(mockVariables));
		const history = createMemoryHistory({
			initialEntries: [`/?${QueryParams.variables}=${encodedVariables}`],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		expect(result.current.getUrlVariables()).toEqual(mockVariables);
	});

	it('should handle malformed URL parameters gracefully', () => {
		const history = createMemoryHistory({
			initialEntries: [`/?${QueryParams.variables}=invalid-json`],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		// Should return empty object when JSON parsing fails
		expect(result.current.getUrlVariables()).toEqual({});
	});

	it('should set variables to URL correctly', () => {
		const history = createMemoryHistory({
			initialEntries: ['/'],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		const mockVariables: LocalStoreDashboardVariables = {
			var1: 'value1',
			var2: ['value2', 'value3'],
		};

		act(() => {
			result.current.setUrlVariables(mockVariables);
		});

		// Check if the URL was updated correctly
		const searchParams = new URLSearchParams(history.location.search);
		const urlVariables = searchParams.get(QueryParams.variables);

		expect(urlVariables).toBeTruthy();
		expect(JSON.parse(decodeURIComponent(urlVariables || ''))).toEqual(
			mockVariables,
		);
	});

	it('should remove variables param from URL when empty object is provided', () => {
		const mockVariables = {
			var1: 'value1',
			var2: ['value2', 'value3'],
		};

		const encodedVariables = encodeURIComponent(JSON.stringify(mockVariables));
		const history = createMemoryHistory({
			initialEntries: [`/?${QueryParams.variables}=${encodedVariables}`],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		act(() => {
			result.current.setUrlVariables({});
		});

		// Check if the URL param was removed
		const searchParams = new URLSearchParams(history.location.search);
		expect(searchParams.has(QueryParams.variables)).toBe(false);
	});

	it('should update a specific variable correctly', () => {
		const initialVariables = {
			var1: 'value1',
			var2: ['value2', 'value3'],
		};

		const encodedVariables = encodeURIComponent(JSON.stringify(initialVariables));
		const history = createMemoryHistory({
			initialEntries: [`/?${QueryParams.variables}=${encodedVariables}`],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		const newValue: IDashboardVariable['selectedValue'] = 'updated-value';

		act(() => {
			result.current.updateUrlVariable('var1', newValue);
		});

		// Check if only the specified variable was updated
		const updatedVariables = result.current.getUrlVariables();
		expect(updatedVariables.var1).toEqual(newValue);
		expect(updatedVariables.var2).toEqual(initialVariables.var2);
	});

	it('should preserve other URL parameters when updating variables', () => {
		const history = createMemoryHistory({
			initialEntries: ['/?otherParam=value'],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		const mockVariables: LocalStoreDashboardVariables = {
			var1: 'value1',
		};

		act(() => {
			result.current.setUrlVariables(mockVariables);
		});

		// Check if other params are preserved
		const searchParams = new URLSearchParams(history.location.search);
		expect(searchParams.get('otherParam')).toBe('value');
		expect(searchParams.has(QueryParams.variables)).toBe(true);
	});

	it('should handle different variable value types correctly', () => {
		const mockVariables: LocalStoreDashboardVariables = {
			stringVar: 'production',
			numberVar: 123,
			booleanVar: true,
			arrayVar: ['service1', 'service2'],
			mixedArrayVar: ['string', 456, false],
			nullVar: null,
		};

		const encodedVariables = encodeURIComponent(JSON.stringify(mockVariables));
		const history = createMemoryHistory({
			initialEntries: [`/?${QueryParams.variables}=${encodedVariables}`],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		const urlVariables = result.current.getUrlVariables();
		expect(urlVariables.stringVar).toBe('production');
		expect(urlVariables.numberVar).toBe(123);
		expect(urlVariables.booleanVar).toBe(true);
		expect(urlVariables.arrayVar).toEqual(['service1', 'service2']);
		expect(urlVariables.mixedArrayVar).toEqual(['string', 456, false]);
		expect(urlVariables.nullVar).toBeNull();
	});

	it('should handle edge cases in URL variable parsing', () => {
		const edgeCaseVariables = {
			emptyString: '',
			emptyArray: [],
			singleItemArray: ['solo'],
		};

		const encodedVariables = encodeURIComponent(
			JSON.stringify(edgeCaseVariables),
		);
		const history = createMemoryHistory({
			initialEntries: [`/?${QueryParams.variables}=${encodedVariables}`],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		const urlVariables = result.current.getUrlVariables();
		expect(urlVariables.emptyString).toBe('');
		expect(urlVariables.emptyArray).toEqual([]);
		expect(urlVariables.singleItemArray).toEqual(['solo']);
		expect(urlVariables.undefinedVar).toBeUndefined();
	});

	it('should update variables with array values correctly', () => {
		const history = createMemoryHistory({
			initialEntries: ['/'],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		const arrayValue: IDashboardVariable['selectedValue'] = [
			'value1',
			'value2',
			'value3',
		];

		act(() => {
			result.current.updateUrlVariable('multiSelectVar', arrayValue);
		});

		const updatedVariables = result.current.getUrlVariables();
		expect(updatedVariables.multiSelectVar).toEqual(arrayValue);
	});
});
