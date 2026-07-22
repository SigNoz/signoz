import { fireEvent, render, screen } from '@testing-library/react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import ConfigPane from '../ConfigPane';

// The Actions group's hook navigates/logs; stub it so ConfigPane renders without a router.
jest.mock(
	'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/hooks/useCreateAlertFromPanel',
	() => ({
		useCreateAlertFromPanel: (): jest.Mock => jest.fn(),
	}),
);

function spec(unit?: string): DashboardtypesPanelSpecDTO {
	return {
		display: { name: 'CPU', description: 'usage' },
		plugin: {
			kind: 'signoz/TimeSeriesPanel',
			spec: unit ? { formatting: { unit } } : {},
		},
		queries: [],
	} as unknown as DashboardtypesPanelSpecDTO;
}

function renderConfigPane(
	overrides: Partial<React.ComponentProps<typeof ConfigPane>> = {},
): React.ComponentProps<typeof ConfigPane> {
	const props: React.ComponentProps<typeof ConfigPane> = {
		spec: spec(),
		onChangeSpec: jest.fn(),
		onChangePanelKind: jest.fn(),
		queryType: EQueryType.QUERY_BUILDER,
		legendSeries: [],
		tableColumns: [],
		panel: { kind: 'Panel', spec: spec() } as DashboardtypesPanelDTO,
		panelId: 'panel-1',
		...overrides,
	};
	render(<ConfigPane {...props} />);
	return props;
}

describe('ConfigPane', () => {
	it('renders the seeded title and description', () => {
		renderConfigPane();

		expect(screen.getByTestId('panel-editor-v2-title')).toHaveValue('CPU');
		expect(screen.getByTestId('panel-editor-v2-description')).toHaveValue(
			'usage',
		);
	});

	it('reports title edits through onChangeSpec (into spec.display)', () => {
		const { onChangeSpec } = renderConfigPane();

		fireEvent.change(screen.getByTestId('panel-editor-v2-title'), {
			target: { value: 'Memory' },
		});

		expect(onChangeSpec).toHaveBeenCalledWith(
			expect.objectContaining({
				display: { name: 'Memory', description: 'usage' },
			}),
		);
	});

	it('renders the Formatting section for a kind that declares it', () => {
		renderConfigPane();
		// The TimeSeries kind declares a Formatting section; its collapsible header shows.
		expect(
			screen.getByTestId('config-section-formatting-&-units'),
		).toBeInTheDocument();
	});

	it('renders the Actions group for a create-alert-capable panel', () => {
		// renderConfigPane defaults to a TimeSeries panel, which can seed an alert.
		renderConfigPane();

		expect(screen.getByText('Actions')).toBeInTheDocument();
		expect(
			screen.getByTestId('panel-editor-v2-create-alert'),
		).toBeInTheDocument();
	});

	it('omits the create-alert action for a kind that cannot seed an alert', () => {
		// Table panels can't seed alerts → the Actions group hides its row. Only the
		// panel passed to ConfigActions needs the kind; sections are asserted elsewhere.
		const panel = {
			kind: 'Panel',
			spec: { ...spec(), plugin: { kind: 'signoz/TablePanel', spec: {} } },
		} as DashboardtypesPanelDTO;
		renderConfigPane({ panel });

		expect(
			screen.queryByTestId('panel-editor-v2-create-alert'),
		).not.toBeInTheDocument();
	});
});
