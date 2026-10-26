import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';

import ConfigActions from '../ConfigActions';

const mockCreateAlert = jest.fn();
jest.mock(
	'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/hooks/useCreateAlertFromPanel',
	() => ({
		useCreateAlertFromPanel: jest.fn(() => mockCreateAlert),
	}),
);

function makePanel(
	kind: string,
	queries: unknown[] = [],
): DashboardtypesPanelDTO {
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'CPU' },
			plugin: { kind, spec: {} },
			queries,
		},
	} as unknown as DashboardtypesPanelDTO;
}

const aiQueries = [
	{
		kind: 'time_series',
		spec: {
			plugin: {
				kind: 'signoz/CompositeQuery',
				spec: {
					queries: [
						{ type: 'builder_ai_query', spec: { name: 'A', signal: 'traces' } },
					],
				},
			},
		},
	},
];

describe('ConfigActions', () => {
	beforeEach(() => jest.clearAllMocks());

	it('offers "Create alert rule" for a create-alert-capable kind and seeds from the panel', async () => {
		const user = userEvent.setup();
		const panel = makePanel('signoz/TimeSeriesPanel');
		render(<ConfigActions panel={panel} panelId="panel-1" />);

		const row = screen.getByTestId('panel-editor-v2-create-alert');
		expect(row).toHaveTextContent('Create alert');

		await user.click(row);
		expect(mockCreateAlert).toHaveBeenCalledWith(panel, 'panel-1');
	});

	it('offers "Create alert" for an AI query panel', async () => {
		const user = userEvent.setup();
		const panel = makePanel('signoz/TimeSeriesPanel', aiQueries);
		render(<ConfigActions panel={panel} panelId="panel-1" />);

		await user.click(screen.getByTestId('panel-editor-v2-create-alert'));
		expect(mockCreateAlert).toHaveBeenCalledWith(panel, 'panel-1');
	});

	it('renders nothing for a kind that cannot seed an alert', () => {
		const { container } = render(
			<ConfigActions panel={makePanel('signoz/TablePanel')} panelId="panel-1" />,
		);

		expect(
			screen.queryByTestId('panel-editor-v2-create-alert'),
		).not.toBeInTheDocument();
		expect(container).toBeEmptyDOMElement();
	});
});
