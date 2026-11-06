import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { renderWithExplorerProviders } from 'container/SavedViews/__tests__/savedViewsTestUtils';
import { act, screen } from 'tests/test-utils';

import Explorer from '../Explorer';

jest.mock('../ListView/ListView', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="ai-list-view" />,
}));
jest.mock('../TableView/TableView', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="ai-table-view" />,
}));

const explorerUrlWithPanel = (panelType: PANEL_TYPES): string =>
	`${ROUTES.AI_OBSERVABILITY_EXPLORER}?${QueryParams.panelTypes}=${encodeURIComponent(
		JSON.stringify(panelType),
	)}`;

describe('AI observability Explorer', () => {
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
});
