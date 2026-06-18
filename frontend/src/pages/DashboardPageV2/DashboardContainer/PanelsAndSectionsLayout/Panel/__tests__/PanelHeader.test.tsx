import { TooltipProvider } from '@signozhq/ui/tooltip';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import type { Warning } from 'types/api';

import PanelHeader from '../PanelHeader/PanelHeader';
import { PanelKind } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';

// PanelHeader's status indicators render a radix tooltip, which needs a
// TooltipProvider ancestor (supplied globally by AppLayout at runtime).
const renderWithProvider = (ui: ReactElement): ReturnType<typeof render> =>
	render(<TooltipProvider>{ui}</TooltipProvider>);

// The actions menu has its own gating logic (kind/role/context) and its own
// tests; stub it so this test exercises only the header's status indicators.
jest.mock(
	'../PanelActionsMenu/PanelActionsMenu',
	() =>
		function MockPanelActionsMenu(): null {
			return null;
		},
);

const baseProps = {
	title: 'My panel',
	panelKind: 'signoz/TimeSeriesPanel' as PanelKind,
	panelId: 'panel-1',
	isFetching: false,
};

const warning: Warning = {
	code: 'partial_data',
	message: 'Some series were dropped',
	url: '',
	warnings: [],
};

describe('PanelHeader status indicators', () => {
	it('shows the error indicator whenever an error is present', () => {
		renderWithProvider(<PanelHeader {...baseProps} error={new Error('boom')} />);
		expect(screen.getByTestId('panel-status-error')).toBeInTheDocument();
	});

	it('shows the warning indicator whenever a warning is present', () => {
		renderWithProvider(<PanelHeader {...baseProps} warning={warning} />);
		expect(screen.getByTestId('panel-status-warning')).toBeInTheDocument();
	});

	it('renders no status indicators when there is no error or warning', () => {
		renderWithProvider(<PanelHeader {...baseProps} />);
		expect(screen.queryByTestId('panel-status-error')).not.toBeInTheDocument();
		expect(screen.queryByTestId('panel-status-warning')).not.toBeInTheDocument();
	});
});

describe('PanelHeader search', () => {
	it('renders no search affordance when the panel is not searchable', () => {
		renderWithProvider(<PanelHeader {...baseProps} />);
		expect(
			screen.queryByTestId('panel-header-search-trigger'),
		).not.toBeInTheDocument();
	});

	it('expands the collapsed trigger into an input and reports changes', async () => {
		const user = userEvent.setup();
		const onSearchChange = jest.fn();
		renderWithProvider(
			<PanelHeader
				{...baseProps}
				searchable
				searchTerm=""
				onSearchChange={onSearchChange}
			/>,
		);

		await user.click(screen.getByTestId('panel-header-search-trigger'));

		// The input is controlled to the (fixed) `searchTerm` here, so each keystroke
		// reports a single character — assert one to confirm changes are propagated.
		const input = screen.getByTestId('panel-header-search-input');
		await user.type(input, 'f');
		expect(onSearchChange).toHaveBeenCalledWith('f');
	});

	it('clears the term and collapses when the clear button is pressed', async () => {
		const user = userEvent.setup();
		const onSearchChange = jest.fn();
		renderWithProvider(
			<PanelHeader
				{...baseProps}
				searchable
				searchTerm="frontend"
				onSearchChange={onSearchChange}
			/>,
		);

		await user.click(screen.getByTestId('panel-header-search-trigger'));
		await user.click(screen.getByTestId('panel-header-search-clear'));

		expect(onSearchChange).toHaveBeenCalledWith('');
		expect(screen.getByTestId('panel-header-search-trigger')).toBeInTheDocument();
	});
});

describe('PanelHeader time-preference pill', () => {
	it('shows the pill with the short label when the panel overrides the dashboard time', () => {
		renderWithProvider(
			<PanelHeader
				{...baseProps}
				timeLabel={{ short: '6h', full: 'Last 6 hr' }}
			/>,
		);
		expect(screen.getByTestId('panel-time-preference')).toHaveTextContent('6h');
	});

	it('renders no pill when the panel follows the dashboard time', () => {
		renderWithProvider(<PanelHeader {...baseProps} timeLabel={null} />);
		expect(screen.queryByTestId('panel-time-preference')).not.toBeInTheDocument();
	});
});
