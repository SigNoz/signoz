import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { getPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/registry';

import PanelTypeSwitcher from '../PanelTypeSwitcher';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { EQueryType } from 'types/common/dashboard';

const OPTIONS = [
	{ kind: 'signoz/TimeSeriesPanel', displayName: 'Time Series' },
	{ kind: 'signoz/NumberPanel', displayName: 'Number' },
	{ kind: 'signoz/TablePanel', displayName: 'Table' },
	{ kind: 'signoz/BarChartPanel', displayName: 'Bar Chart' },
	{ kind: 'signoz/AreaChartPanel', displayName: 'Area' },
	{ kind: 'signoz/PieChartPanel', displayName: 'Pie Chart' },
	{ kind: 'signoz/HistogramPanel', displayName: 'Histogram' },
	{ kind: 'signoz/ListPanel', displayName: 'List' },
	{ kind: 'signoz/TextPanel', displayName: 'Text' },
].map((option) => ({ ...option, icon: (): null => null }));

// Stub the registry so the test doesn't pull in the real renderers and chart libs.
jest.mock('pages/DashboardPage/DashboardContainer/Panels/registry', () => ({
	getPanelDefinition: jest.fn(),
	get PANEL_OPTIONS(): unknown {
		return OPTIONS;
	},
}));

const mockGetPanelDefinition = getPanelDefinition as unknown as jest.Mock;

// Query-type support per kind: List is Query-Builder-only; Table/Pie drop PromQL.
const SUPPORTED_QUERY_TYPES: Record<string, EQueryType[]> = {
	'signoz/ListPanel': [EQueryType.QUERY_BUILDER],
	'signoz/TablePanel': [EQueryType.QUERY_BUILDER, EQueryType.CLICKHOUSE],
	'signoz/PieChartPanel': [EQueryType.QUERY_BUILDER, EQueryType.CLICKHOUSE],
};

function renderSwitcher(
	props: Partial<Parameters<typeof PanelTypeSwitcher>[0]> = {},
): jest.Mock {
	const onChange = jest.fn();
	render(
		<TooltipProvider>
			<PanelTypeSwitcher
				panelKind="signoz/TimeSeriesPanel"
				queryType={EQueryType.QUERY_BUILDER}
				onChange={onChange}
				{...props}
			/>
		</TooltipProvider>,
	);
	fireEvent.click(screen.getByTestId('panel-editor-v2-type-switcher'));
	return onChange;
}

function disabledKinds(): (string | undefined)[] {
	return Array.from(
		document.querySelectorAll('[data-testid^="panel-type-signoz/"]'),
	)
		.filter((el) => el.getAttribute('aria-disabled') === 'true')
		.map((el) => el.getAttribute('data-testid')?.replace('panel-type-', ''));
}

describe('PanelTypeSwitcher', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// List supports only logs/traces; every other kind also supports metrics.
		// Query-type support comes from SUPPORTED_QUERY_TYPES (all three by default).
		mockGetPanelDefinition.mockImplementation((kind: string) => ({
			...OPTIONS.find((option) => option.kind === kind),
			mode: kind === 'signoz/TextPanel' ? 'static' : 'query',
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

	it('shows the current type and switches to the chosen one', () => {
		const onChange = renderSwitcher();

		expect(screen.getByTestId('panel-editor-v2-type-switcher')).toHaveTextContent(
			'Time SeriesChange',
		);
		fireEvent.click(screen.getByTestId('panel-type-signoz/ListPanel'));

		expect(onChange).toHaveBeenCalledWith('signoz/ListPanel');
	});

	it('does not fire onChange when the current type is picked again', () => {
		const onChange = renderSwitcher();

		fireEvent.click(screen.getByTestId('panel-type-signoz/TimeSeriesPanel'));

		expect(onChange).not.toHaveBeenCalled();
	});

	it('disables types whose supported signals exclude the current signal', () => {
		const onChange = renderSwitcher({ signal: TelemetrytypesSignalDTO.metrics });

		expect(disabledKinds()).toStrictEqual(['signoz/ListPanel']);
		fireEvent.click(screen.getByTestId('panel-type-signoz/ListPanel'));
		expect(onChange).not.toHaveBeenCalled();
	});

	it('does not disable any type when the signal is unknown (builder, no signal)', () => {
		renderSwitcher();

		expect(disabledKinds()).toHaveLength(0);
	});

	it('disables Query-Builder-only kinds under PromQL even without a signal', () => {
		renderSwitcher({ queryType: EQueryType.PROM });

		expect(disabledKinds()).toStrictEqual(
			expect.arrayContaining([
				'signoz/ListPanel',
				'signoz/TablePanel',
				'signoz/PieChartPanel',
			]),
		);
		expect(disabledKinds()).not.toContain('signoz/TimeSeriesPanel');
		expect(disabledKinds()).not.toContain('signoz/TextPanel');
	});

	it('disables List under ClickHouse while Table/Pie stay enabled', () => {
		renderSwitcher({
			panelKind: 'signoz/TablePanel',
			queryType: EQueryType.CLICKHOUSE,
		});

		expect(disabledKinds()).toStrictEqual(['signoz/ListPanel']);
	});

	describe('revert', () => {
		it('is hidden while the type is the original one', () => {
			renderSwitcher({ originalPanelKind: 'signoz/TimeSeriesPanel' });

			expect(
				screen.queryByTestId('panel-editor-v2-type-revert'),
			).not.toBeInTheDocument();
		});

		it('switches back to the original type', () => {
			const onChange = renderSwitcher({
				panelKind: 'signoz/TablePanel',
				originalPanelKind: 'signoz/TimeSeriesPanel',
			});

			const revert = screen.getByTestId('panel-editor-v2-type-revert');
			expect(revert).toHaveTextContent('Revert to Time Series');
			fireEvent.click(revert);

			expect(onChange).toHaveBeenCalledWith('signoz/TimeSeriesPanel');
		});

		it('is disabled when the original type no longer fits the query', () => {
			renderSwitcher({
				panelKind: 'signoz/TimeSeriesPanel',
				originalPanelKind: 'signoz/ListPanel',
				queryType: EQueryType.PROM,
			});

			expect(screen.getByTestId('panel-editor-v2-type-revert')).toBeDisabled();
		});
	});
});
