import { TooltipProvider } from '@signozhq/ui/tooltip';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { Warning } from 'types/api';

import PanelHeader from '../PanelHeader/PanelHeader';

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
	panelKind: 'signoz/TimeSeriesPanel',
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
