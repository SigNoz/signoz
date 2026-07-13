import { render, screen } from '@testing-library/react';
import { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import { OPERATORS } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { EQueryType } from 'types/common/dashboard';

import PanelEditorQueryBuilder from '../PanelEditorQueryBuilder';

// Capture the props the (real-guard-fed) QueryBuilderV2 receives without rendering it.
const mockQueryBuilderV2 = jest.fn();

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
jest.mock('hooks/useDarkMode', () => ({ useIsDarkMode: (): boolean => false }));
jest.mock('components/QueryBuilderV2/QueryBuilderV2', () => ({
	QueryBuilderV2: (props: unknown): null => {
		mockQueryBuilderV2(props);
		return null;
	},
}));
jest.mock(
	'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/ClickHouse',
	() => ({ __esModule: true, default: (): null => null }),
);
jest.mock(
	'container/NewWidget/LeftContainer/QuerySection/QueryBuilder/promQL',
	() => ({ __esModule: true, default: (): null => null }),
);
jest.mock('container/QueryBuilder/components/RunQueryBtn/RunQueryBtn', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('components/TextToolTip', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('assets/Dashboard/PromQl', () => ({
	__esModule: true,
	default: (): null => null,
}));

const mockUseQueryBuilder = useQueryBuilder as unknown as jest.Mock;

function renderBuilder(
	panelKind: string,
	signal: TelemetrytypesSignalDTO = TelemetrytypesSignalDTO.logs,
): void {
	render(
		<PanelEditorQueryBuilder
			panelKind={panelKind as never}
			signal={signal}
			isLoadingQueries={false}
			onStageRunQuery={jest.fn()}
			onCancelQuery={jest.fn()}
		/>,
	);
}

function lastQueryBuilderProps(): {
	panelType: string;
	isListViewPanel: boolean;
	filterConfigs: unknown;
} {
	const calls = mockQueryBuilderV2.mock.calls;
	return calls[calls.length - 1][0];
}

describe('PanelEditorQueryBuilder query-type tabs (driven by the capabilities guard)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseQueryBuilder.mockReturnValue({
			currentQuery: { queryType: EQueryType.QUERY_BUILDER },
			redirectWithQueryBuilderData: jest.fn(),
		});
	});

	it('shows only the Query Builder tab for the List kind', () => {
		renderBuilder('signoz/ListPanel', TelemetrytypesSignalDTO.logs);

		expect(screen.getByText('Query Builder')).toBeInTheDocument();
		expect(screen.queryByText('ClickHouse Query')).not.toBeInTheDocument();
		expect(screen.queryByText('PromQL')).not.toBeInTheDocument();
	});

	it('shows Query Builder + ClickHouse but not PromQL for the Table kind', () => {
		renderBuilder('signoz/TablePanel');

		expect(screen.getByText('Query Builder')).toBeInTheDocument();
		expect(screen.getByText('ClickHouse Query')).toBeInTheDocument();
		expect(screen.queryByText('PromQL')).not.toBeInTheDocument();
	});

	it('shows all three tabs for the Time Series kind', () => {
		renderBuilder('signoz/TimeSeriesPanel');

		expect(screen.getByText('Query Builder')).toBeInTheDocument();
		expect(screen.getByText('ClickHouse Query')).toBeInTheDocument();
		expect(screen.getByText('PromQL')).toBeInTheDocument();
	});
});

describe('PanelEditorQueryBuilder field visibility (driven by the capabilities guard)', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseQueryBuilder.mockReturnValue({
			currentQuery: { queryType: EQueryType.QUERY_BUILDER },
			redirectWithQueryBuilderData: jest.fn(),
		});
	});

	it('passes empty field config + non-list flag for a non-list kind', () => {
		renderBuilder('signoz/TimeSeriesPanel', TelemetrytypesSignalDTO.metrics);

		const props = lastQueryBuilderProps();
		expect(props.panelType).toBe('graph');
		expect(props.isListViewPanel).toBe(false);
		expect(props.filterConfigs).toStrictEqual({});
	});

	it('hides step interval / having and sets body-contains for List + logs', () => {
		renderBuilder('signoz/ListPanel', TelemetrytypesSignalDTO.logs);

		const props = lastQueryBuilderProps();
		expect(props.panelType).toBe('list');
		expect(props.isListViewPanel).toBe(true);
		expect(props.filterConfigs).toStrictEqual({
			stepInterval: { isHidden: true, isDisabled: true },
			having: { isHidden: true, isDisabled: true },
			filters: { customKey: 'body', customOp: OPERATORS.CONTAINS },
		});
	});

	it('additionally hides limit for List + traces', () => {
		renderBuilder('signoz/ListPanel', TelemetrytypesSignalDTO.traces);

		const props = lastQueryBuilderProps();
		expect(props.filterConfigs).toStrictEqual({
			stepInterval: { isHidden: true, isDisabled: true },
			having: { isHidden: true, isDisabled: true },
			limit: { isHidden: true, isDisabled: true },
			filters: { customKey: 'body', customOp: OPERATORS.CONTAINS },
		});
	});
});
