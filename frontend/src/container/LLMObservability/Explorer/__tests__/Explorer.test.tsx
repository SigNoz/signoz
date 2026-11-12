import type { QuickFiltersLayoutProps } from 'components/QuickFilters/QuickFiltersLayout/QuickFiltersLayout';
import { LOCALSTORAGE } from 'constants/localStorage';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import {
	defaultOptionsQuery,
	URL_OPTIONS,
} from 'container/OptionsMenu/constants';
import {
	renderWithExplorerProviders,
	urlParam,
} from 'container/SavedViews/__tests__/savedViewsTestUtils';
import { act, screen, userEvent } from 'tests/test-utils';

import Explorer from '../Explorer';

jest.mock(
	'components/QuickFilters/QuickFiltersLayout/QuickFiltersLayout',
	() => ({
		__esModule: true,
		default: ({ children }: QuickFiltersLayoutProps): JSX.Element => (
			<div>{children}</div>
		),
	}),
);
jest.mock('../QuerySection/QuerySection', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('../ListView/ListView', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="ai-list-view" />,
}));
jest.mock('../TableView/TableView', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="ai-table-view" />,
}));
jest.mock('../TracesView/TracesView', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="ai-trace-view" />,
}));

const explorerUrlWithPanel = (panelType: PANEL_TYPES): string =>
	`${ROUTES.AI_OBSERVABILITY_EXPLORER}?${QueryParams.panelTypes}=${encodeURIComponent(
		JSON.stringify(panelType),
	)}`;

describe('AI observability Explorer', () => {
	afterEach(() => {
		localStorage.clear();
	});

	it('shows the view of the panel type in the url', () => {
		renderWithExplorerProviders(
			<Explorer />,
			explorerUrlWithPanel(PANEL_TYPES.LIST),
		);

		expect(screen.getByTestId('ai-list-view')).toBeInTheDocument();
	});

	it('follows the url when the panel type changes, as opening a saved view does', () => {
		const { history } = renderWithExplorerProviders(
			<Explorer />,
			explorerUrlWithPanel(PANEL_TYPES.LIST),
		);

		act(() => {
			history.push(explorerUrlWithPanel(PANEL_TYPES.TABLE));
		});

		expect(screen.getByTestId('ai-table-view')).toBeInTheDocument();
		expect(screen.queryByTestId('ai-list-view')).not.toBeInTheDocument();
	});

	it('clears the url columns of the panel being left', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const traceColumns = [{ name: 'span_count' }];
		localStorage.setItem(
			LOCALSTORAGE.AI_OBSERVABILITY_PANEL_COLUMNS,
			JSON.stringify({ [PANEL_TYPES.TRACE]: traceColumns }),
		);
		const { history } = renderWithExplorerProviders(
			<Explorer />,
			`${explorerUrlWithPanel(PANEL_TYPES.TRACE)}&${URL_OPTIONS}=${encodeURIComponent(
				JSON.stringify({ ...defaultOptionsQuery, selectColumns: traceColumns }),
			)}`,
		);

		expect(screen.getByTestId('ai-trace-view')).toBeInTheDocument();
		expect(
			JSON.parse(urlParam(history, URL_OPTIONS) ?? '').selectColumns,
		).toStrictEqual(traceColumns);

		await user.click(screen.getByTestId('search-view'));

		expect(screen.getByTestId('ai-list-view')).toBeInTheDocument();
		expect(screen.queryByTestId('ai-trace-view')).not.toBeInTheDocument();
		expect(JSON.parse(urlParam(history, QueryParams.panelTypes) ?? '')).toBe(
			PANEL_TYPES.LIST,
		);
		expect(JSON.parse(urlParam(history, URL_OPTIONS) ?? '')).toStrictEqual({
			...defaultOptionsQuery,
			selectColumns: [],
		});
	});
});
