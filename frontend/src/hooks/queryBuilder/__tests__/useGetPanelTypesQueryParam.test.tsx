import React from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PANEL_TYPES } from 'constants/queryBuilder';

import { useGetPanelTypesQueryParam } from '../useGetPanelTypesQueryParam';

const makeWrapper = (
	search = '',
): React.ComponentType<{ children: React.ReactNode }> => {
	const PanelTypesWrapper = ({
		children,
	}: {
		children: React.ReactNode;
	}): React.ReactElement => (
		<MemoryRouter initialEntries={[`/logs-explorer${search}`]}>
			{children}
		</MemoryRouter>
	);
	PanelTypesWrapper.displayName = 'PanelTypesWrapper';
	return PanelTypesWrapper;
};

describe('useGetPanelTypesQueryParam', () => {
	it('returns the default panel type when the param is absent', () => {
		const { result } = renderHook(
			() => useGetPanelTypesQueryParam(PANEL_TYPES.LIST),
			{ wrapper: makeWrapper() },
		);

		expect(result.current).toBe(PANEL_TYPES.LIST);
	});

	it('returns null when the param is absent and no default is given', () => {
		const { result } = renderHook(() => useGetPanelTypesQueryParam(), {
			wrapper: makeWrapper(),
		});

		expect(result.current).toBeNull();
	});

	it('parses the JSON-encoded form written by the explorers', () => {
		const { result } = renderHook(
			() => useGetPanelTypesQueryParam(PANEL_TYPES.LIST),
			{ wrapper: makeWrapper('?panelTypes=%22list%22') },
		);

		expect(result.current).toBe(PANEL_TYPES.LIST);
	});

	it('accepts the plain string form written by alert URL builders', () => {
		// Regression: `panelTypes=graph` (no JSON quoting) used to throw in
		// JSON.parse and crash the Logs/Traces explorers via the error boundary.
		const { result } = renderHook(
			() => useGetPanelTypesQueryParam(PANEL_TYPES.LIST),
			{ wrapper: makeWrapper('?panelTypes=graph') },
		);

		expect(result.current).toBe(PANEL_TYPES.TIME_SERIES);
	});

	it('falls back to the default for a JSON value that is not a panel type', () => {
		const { result } = renderHook(
			() => useGetPanelTypesQueryParam(PANEL_TYPES.LIST),
			{ wrapper: makeWrapper('?panelTypes=%22not-a-panel%22') },
		);

		expect(result.current).toBe(PANEL_TYPES.LIST);
	});

	it('falls back to the default for an unparseable value', () => {
		const { result } = renderHook(
			() => useGetPanelTypesQueryParam(PANEL_TYPES.LIST),
			{ wrapper: makeWrapper('?panelTypes=total-garbage') },
		);

		expect(result.current).toBe(PANEL_TYPES.LIST);
	});
});
