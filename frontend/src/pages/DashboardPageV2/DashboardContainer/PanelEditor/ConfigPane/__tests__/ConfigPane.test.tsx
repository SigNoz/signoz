import { fireEvent, render, screen } from '@testing-library/react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

import ConfigPane from '../ConfigPane';

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
		panelKind: 'signoz/TimeSeriesPanel',
		spec: spec(),
		onChangeSpec: jest.fn(),
		onChangePanelKind: jest.fn(),
		queryType: EQueryType.QUERY_BUILDER,
		legendSeries: [],
		tableColumns: [],
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
});
