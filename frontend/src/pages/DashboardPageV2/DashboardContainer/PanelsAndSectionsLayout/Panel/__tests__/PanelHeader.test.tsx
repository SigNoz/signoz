import { TooltipProvider } from '@signozhq/ui/tooltip';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import type { ReactElement } from 'react';
import type { Warning } from 'types/api';

import PanelHeader from '../PanelHeader/PanelHeader';

// Status indicators use a radix tooltip, which needs a TooltipProvider ancestor
// (supplied globally by AppLayout at runtime).
const renderWithProvider = (ui: ReactElement): ReturnType<typeof render> =>
	render(<TooltipProvider>{ui}</TooltipProvider>);

// Stub the actions menu (its gating logic is tested separately) so this asserts
// only whether the menu mounts, per the `hideActions` switch.
jest.mock(
	'../PanelActionsMenu/PanelActionsMenu',
	() =>
		function MockPanelActionsMenu(): ReactElement {
			return <div data-testid="panel-actions-menu" />;
		},
);

// The header reads its name/description/kind off the panel itself.
function makePanel(overrides?: {
	name?: string;
	description?: string;
}): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: {
				name: overrides?.name ?? 'My panel',
				description: overrides?.description,
			},
			plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
			queries: [],
		},
	} as unknown as DashboardtypesPanelDTO;
}

// Blank name so the editor-preview guard test relies on the warning alone.
function makePanelWithQueries(
	kind: string,
	enabled: number,
	disabled = 0,
): DashboardtypesPanelDTO {
	const envelope = (isDisabled: boolean): unknown => ({
		type: 'builder_query',
		spec: { disabled: isDisabled },
	});
	return {
		kind: 'Panel',
		spec: {
			display: { name: '' },
			plugin: { kind, spec: {} },
			queries: [
				{
					spec: {
						plugin: {
							kind: 'signoz/CompositeQuery',
							spec: {
								queries: [
									...Array.from({ length: enabled }, () => envelope(false)),
									...Array.from({ length: disabled }, () => envelope(true)),
								],
							},
						},
					},
				},
			],
		},
	} as unknown as DashboardtypesPanelDTO;
}

const baseProps = {
	panel: makePanel(),
	panelId: 'panel-1',
	data: {
		response: undefined,
		requestPayload: undefined,
		legendMap: {},
	} as PanelQueryData,
	isFetching: false,
};

const warning: Warning = {
	code: 'partial_data',
	message: 'Some series were dropped',
	url: '',
	warnings: [],
};

describe('PanelHeader title and description', () => {
	it('renders the panel name', () => {
		renderWithProvider(<PanelHeader {...baseProps} />);
		expect(screen.getByText('My panel')).toBeInTheDocument();
	});

	it('shows the description info icon when a description is provided', () => {
		renderWithProvider(
			<PanelHeader
				{...baseProps}
				panel={makePanel({ description: 'What this panel measures' })}
			/>,
		);
		expect(screen.getByTestId('panel-header-info-icon')).toBeInTheDocument();
	});

	it('renders no description info icon when there is no description', () => {
		renderWithProvider(<PanelHeader {...baseProps} />);
		expect(
			screen.queryByTestId('panel-header-info-icon'),
		).not.toBeInTheDocument();
	});
});

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

describe('PanelHeader multi-query config warning (issue #9512)', () => {
	it('warns when a Number panel has more than one enabled query', () => {
		renderWithProvider(
			<PanelHeader
				{...baseProps}
				panel={makePanelWithQueries('signoz/NumberPanel', 2)}
			/>,
		);
		expect(screen.getByTestId('panel-status-config-warning')).toBeInTheDocument();
	});

	it('does not warn when only one query is enabled (others disabled)', () => {
		renderWithProvider(
			<PanelHeader
				{...baseProps}
				panel={makePanelWithQueries('signoz/NumberPanel', 1, 2)}
			/>,
		);
		expect(
			screen.queryByTestId('panel-status-config-warning'),
		).not.toBeInTheDocument();
	});

	it('does not warn for non-Number panels with multiple enabled queries', () => {
		renderWithProvider(
			<PanelHeader
				{...baseProps}
				panel={makePanelWithQueries('signoz/TimeSeriesPanel', 3)}
			/>,
		);
		expect(
			screen.queryByTestId('panel-status-config-warning'),
		).not.toBeInTheDocument();
	});

	it('shows the warning in the editor preview (hideActions, no title)', () => {
		renderWithProvider(
			<PanelHeader
				{...baseProps}
				panel={makePanelWithQueries('signoz/NumberPanel', 2)}
				hideActions
			/>,
		);
		expect(screen.getByTestId('panel-status-config-warning')).toBeInTheDocument();
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

		// Input is controlled to a fixed `searchTerm`, so each keystroke reports a
		// single character — one is enough to confirm changes propagate.
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

describe('PanelHeader actions menu', () => {
	it('mounts the actions menu by default', () => {
		renderWithProvider(<PanelHeader {...baseProps} />);
		expect(screen.getByTestId('panel-actions-menu')).toBeInTheDocument();
	});

	it('hides the actions menu when hideActions is set (editor preview)', () => {
		renderWithProvider(<PanelHeader {...baseProps} hideActions />);
		expect(screen.queryByTestId('panel-actions-menu')).not.toBeInTheDocument();
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
