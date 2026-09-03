import { useState } from 'react';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';
import { render, screen, userEvent } from 'tests/test-utils';
import { EQueryType } from 'types/common/dashboard';

import ConfigPane from '../ConfigPane';

// ConfigActions seeds alerts from the panel, which reads the loaded dashboard for
// analytics context — always present under the real editor route.
jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardEventMeta',
	() => ({
		useDashboardEventMeta: (): {
			dashboardId: string;
			dashboardName: string;
		} => ({
			dashboardId: 'dash-1',
			dashboardName: 'Infra overview',
		}),
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

	// Stateful so typed edits feed back into the spec, as the panel editor owns it.
	function Harness(): JSX.Element {
		const [currentSpec, setCurrentSpec] = useState(props.spec);
		return (
			<ConfigPane
				{...props}
				spec={currentSpec}
				onChangeSpec={(next): void => {
					props.onChangeSpec(next);
					setCurrentSpec(next);
				}}
			/>
		);
	}

	render(<Harness />);
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

	it('reports title edits through onChangeSpec (into spec.display)', async () => {
		const user = userEvent.setup();
		const { onChangeSpec } = renderConfigPane();

		const title = screen.getByTestId('panel-editor-v2-title');
		await user.clear(title);
		await user.type(title, 'Memory');

		expect(onChangeSpec).toHaveBeenLastCalledWith(
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
