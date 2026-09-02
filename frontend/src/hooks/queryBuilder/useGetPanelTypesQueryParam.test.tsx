import { Router } from 'react-router-dom';
import { renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { createMemoryHistory } from 'history';

import { useGetPanelTypesQueryParam } from './useGetPanelTypesQueryParam';

const renderWithSearch = (
	search: string,
	defaultPanelType?: PANEL_TYPES,
): PANEL_TYPES | null => {
	const history = createMemoryHistory({
		initialEntries: [`/logs/logs-explorer${search}`],
	});

	const { result } = renderHook(
		() => useGetPanelTypesQueryParam(defaultPanelType),
		{
			wrapper: ({ children }) => <Router history={history}>{children}</Router>,
		},
	);

	return result.current;
};

describe('useGetPanelTypesQueryParam', () => {
	it('reads a JSON encoded panel type, as written by the explorers', () => {
		expect(renderWithSearch('?panelTypes=%22table%22', PANEL_TYPES.LIST)).toBe(
			PANEL_TYPES.TABLE,
		);
	});

	it('reads a plain string panel type, as written by the alerts flow', () => {
		expect(renderWithSearch('?panelTypes=graph', PANEL_TYPES.LIST)).toBe(
			PANEL_TYPES.TIME_SERIES,
		);
	});

	it('falls back to the default for an unparseable panel type', () => {
		expect(renderWithSearch('?panelTypes=%7Bfoo', PANEL_TYPES.LIST)).toBe(
			PANEL_TYPES.LIST,
		);
	});

	it('falls back to the default for a value that is not a panel type', () => {
		expect(renderWithSearch('?panelTypes=%22nope%22', PANEL_TYPES.LIST)).toBe(
			PANEL_TYPES.LIST,
		);
	});

	it('falls back to the default when the param is absent', () => {
		expect(renderWithSearch('', PANEL_TYPES.LIST)).toBe(PANEL_TYPES.LIST);
	});
});
