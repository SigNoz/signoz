import { fireEvent, render, screen } from '@testing-library/react';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';

import PanelTypeSwitcher from '../PanelTypeSwitcher';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

jest.mock('pages/DashboardPageV2/DashboardContainer/Panels/registry', () => ({
	getPanelDefinition: jest.fn(),
}));

const mockGetPanelDefinition = getPanelDefinition as unknown as jest.Mock;

// Query-type support per kind: List is Query-Builder-only; Table/Pie drop PromQL.
const SUPPORTED_QUERY_TYPES: Record<string, EQueryType[]> = {
	'signoz/ListPanel': [EQueryType.QUERY_BUILDER],
	'signoz/TablePanel': [EQueryType.QUERY_BUILDER, EQueryType.CLICKHOUSE],
	'signoz/PieChartPanel': [EQueryType.QUERY_BUILDER, EQueryType.CLICKHOUSE],
};

function disabledLabels(): (string | null)[] {
	return Array.from(
		document.querySelectorAll('.ant-select-item-option-disabled'),
	).map((el) => el.textContent);
}

function openDropdown(): void {
	fireEvent.mouseDown(screen.getByRole('combobox'));
}

describe('PanelTypeSwitcher', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// List supports only logs/traces; every other kind also supports metrics.
		// Query-type support comes from SUPPORTED_QUERY_TYPES (all three by default).
		mockGetPanelDefinition.mockImplementation((kind: string) => ({
			supportedSignals:
				kind === 'signoz/ListPanel'
					? ['logs', 'traces']
					: ['metrics', 'logs', 'traces'],
			supportedQueryTypes: SUPPORTED_QUERY_TYPES[kind] ?? [
				EQueryType.QUERY_BUILDER,
				EQueryType.CLICKHOUSE,
				EQueryType.PROM,
			],
		}));
	});

	it('fires onChange with the chosen plugin kind', () => {
		const onChange = jest.fn();
		render(
			<PanelTypeSwitcher panelKind="signoz/TimeSeriesPanel" onChange={onChange} />,
		);

		openDropdown();
		fireEvent.click(screen.getByText('List'));

		expect(onChange).toHaveBeenCalledWith('signoz/ListPanel');
	});

	it('disables types whose supported signals exclude the current signal', () => {
		render(
			<PanelTypeSwitcher
				panelKind="signoz/TimeSeriesPanel"
				signal={TelemetrytypesSignalDTO.metrics}
				onChange={jest.fn()}
			/>,
		);

		openDropdown();
		// List can't render a metrics query, so it's disabled; Time Series stays enabled.
		expect(disabledLabels()).toContain('List');
		expect(disabledLabels()).not.toContain('Time Series');
	});

	it('does not disable any type when the signal is unknown (builder, no signal)', () => {
		render(
			<PanelTypeSwitcher
				panelKind="signoz/TimeSeriesPanel"
				onChange={jest.fn()}
			/>,
		);

		openDropdown();
		expect(
			document.querySelectorAll('.ant-select-item-option-disabled'),
		).toHaveLength(0);
	});

	it('disables Query-Builder-only kinds under PromQL even without a signal', () => {
		render(
			<PanelTypeSwitcher
				panelKind="signoz/TimeSeriesPanel"
				queryType={EQueryType.PROM}
				onChange={jest.fn()}
			/>,
		);

		openDropdown();
		// List/Table/Pie can't be authored in PromQL; Time Series can.
		expect(disabledLabels()).toContain('List');
		expect(disabledLabels()).toContain('Table');
		expect(disabledLabels()).toContain('Pie Chart');
		expect(disabledLabels()).not.toContain('Time Series');
	});

	it('disables List under ClickHouse while Table/Pie stay enabled', () => {
		render(
			<PanelTypeSwitcher
				panelKind="signoz/TablePanel"
				queryType={EQueryType.CLICKHOUSE}
				onChange={jest.fn()}
			/>,
		);

		openDropdown();
		expect(disabledLabels()).toContain('List');
		expect(disabledLabels()).not.toContain('Table');
		expect(disabledLabels()).not.toContain('Pie Chart');
		expect(disabledLabels()).not.toContain('Time Series');
	});
});
