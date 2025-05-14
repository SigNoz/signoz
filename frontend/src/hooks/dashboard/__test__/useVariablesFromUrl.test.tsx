import { act, renderHook } from '@testing-library/react';
import { QueryParams } from 'constants/query';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

import useVariablesFromUrl from '../useVariablesFromUrl';

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
			var1: { selectedValue: 'value1', allSelected: false },
			var2: { selectedValue: ['value2', 'value3'], allSelected: true },
		};

		const encodedVariables = encodeURIComponent(JSON.stringify(mockVariables));
		const history = createMemoryHistory({
			initialEntries: [`/?${QueryParams.variableConfigs}=${encodedVariables}`],
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
			initialEntries: [`/?${QueryParams.variableConfigs}=invalid-json`],
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

		const mockVariables = {
			var1: { selectedValue: 'value1', allSelected: false },
		};

		act(() => {
			result.current.setUrlVariables(mockVariables);
		});

		// Check if the URL was updated correctly
		const searchParams = new URLSearchParams(history.location.search);
		const urlVariables = searchParams.get(QueryParams.variableConfigs);

		expect(urlVariables).toBeTruthy();
		expect(JSON.parse(decodeURIComponent(urlVariables || ''))).toEqual(
			mockVariables,
		);
	});

	it('should remove variables param from URL when empty object is provided', () => {
		const mockVariables = {
			var1: { selectedValue: 'value1', allSelected: false },
		};

		const encodedVariables = encodeURIComponent(JSON.stringify(mockVariables));
		const history = createMemoryHistory({
			initialEntries: [`/?${QueryParams.variableConfigs}=${encodedVariables}`],
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
		expect(searchParams.has(QueryParams.variableConfigs)).toBe(false);
	});

	it('should update a specific variable correctly', () => {
		const initialVariables = {
			var1: { selectedValue: 'value1', allSelected: false },
			var2: { selectedValue: ['value2'], allSelected: true },
		};

		const encodedVariables = encodeURIComponent(JSON.stringify(initialVariables));
		const history = createMemoryHistory({
			initialEntries: [`/?${QueryParams.variableConfigs}=${encodedVariables}`],
		});

		const { result } = renderHook(() => useVariablesFromUrl(), {
			wrapper: ({ children }: { children: React.ReactNode }) => (
				<Router history={history}>{children}</Router>
			),
		});

		const newValue: IDashboardVariable['selectedValue'] = 'updated-value';

		act(() => {
			result.current.updateUrlVariable('var1', newValue, true);
		});

		// Check if only the specified variable was updated
		const updatedVariables = result.current.getUrlVariables();
		expect(updatedVariables.var1).toEqual({
			selectedValue: newValue,
			allSelected: true,
		});
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

		const mockVariables = {
			var1: { selectedValue: 'value1', allSelected: false },
		};

		act(() => {
			result.current.setUrlVariables(mockVariables);
		});

		// Check if other params are preserved
		const searchParams = new URLSearchParams(history.location.search);
		expect(searchParams.get('otherParam')).toBe('value');
		expect(searchParams.has(QueryParams.variableConfigs)).toBe(true);
	});
});
