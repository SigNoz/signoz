import { render, screen } from '@testing-library/react';
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
jest.mock('container/QueryBuilder/rawQueryEditors/ClickHouse', () => ({
	__esModule: true,
	default: (): null => null,
}));
jest.mock('container/QueryBuilder/rawQueryEditors/PromQL', () => ({
	__esModule: true,
	default: (): null => null,
}));
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

function renderBuilder(panelKind: string): void {
	render(
		<PanelEditorQueryBuilder
			panelKind={panelKind as never}
			isLoadingQueries={false}
			onStageRunQuery={jest.fn()}
			onCancelQuery={jest.fn()}
		/>,
	);
}

function lastQueryBuilderProps(): {
	panelType: string;
	isRawQuery: boolean;
	showTraceOperator: boolean;
	fieldsConfig: unknown;
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
		renderBuilder('signoz/ListPanel');

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
		renderBuilder('signoz/TimeSeriesPanel');

		const props = lastQueryBuilderProps();
		expect(props.panelType).toBe('graph');
		expect(props.isRawQuery).toBe(false);
		// The trace operator combines aggregated trace queries, so it rides along with
		// the aggregation controls.
		expect(props.showTraceOperator).toBe(true);
		expect(props.fieldsConfig).toStrictEqual({});
	});

	it('marks List raw and leaves the field surface to the raw baseline', () => {
		renderBuilder('signoz/ListPanel');

		const props = lastQueryBuilderProps();
		expect(props.panelType).toBe('list');
		expect(props.isRawQuery).toBe(true);
		expect(props.showTraceOperator).toBe(false);
		expect(props.fieldsConfig).toStrictEqual({});
	});
});
