import { renderHook } from '@testing-library/react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { TestRouter } from 'tests/router';

import { useGetPanelTypesQueryParam } from './useGetPanelTypesQueryParam';

const renderWithSearch = (
	search: string,
	defaultPanelType?: PANEL_TYPES,
): PANEL_TYPES | null => {
	const { result } = renderHook(
		() => useGetPanelTypesQueryParam(defaultPanelType),
		{
			wrapper: ({ children }) => (
				<TestRouter initialRoute={`/logs/logs-explorer${search}`}>
					{children}
				</TestRouter>
			),
		},
	);

	return result.current;
};

describe('useGetPanelTypesQueryParam', () => {
	it.each([
		['a JSON encoded panel type', '?panelTypes=%22table%22', PANEL_TYPES.TABLE],
		['a plain string panel type', '?panelTypes=graph', PANEL_TYPES.TIME_SERIES],
		['an unparseable panel type', '?panelTypes=%7Bfoo', PANEL_TYPES.LIST],
		[
			'a value that is not a panel type',
			'?panelTypes=%22nope%22',
			PANEL_TYPES.LIST,
		],
		['an absent param', '', PANEL_TYPES.LIST],
	])('reads %s', (_, search, expected) => {
		expect(renderWithSearch(search, PANEL_TYPES.LIST)).toBe(expected);
	});
});
