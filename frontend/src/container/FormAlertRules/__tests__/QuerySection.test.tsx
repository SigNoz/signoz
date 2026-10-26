import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	aiTraceAlertDefaults,
	alertDefaults,
	traceAlertDefaults,
} from 'container/CreateAlertRule/defaults';
import { render, screen } from 'tests/test-utils';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import type { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { AlertDef } from 'types/api/alerts/def';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import QuerySection from '../QuerySection';

const mockQueryBuilderV2 = jest.fn() as jest.MockedFunction<
	(props: QueryBuilderProps) => void
>;

jest.mock('components/QueryBuilderV2/QueryBuilderV2', () => ({
	QueryBuilderV2: (props: QueryBuilderProps): JSX.Element => {
		mockQueryBuilderV2(props);
		return <div data-testid="query-builder-v2" />;
	},
}));

jest.mock('hooks/hotkeys/useKeyboardHotkeys', () => ({
	useKeyboardHotkeys: (): unknown => ({
		registerShortcut: jest.fn(),
		deregisterShortcut: jest.fn(),
	}),
}));

jest.mock('../ChQuerySection', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="clickhouse-section" />,
}));

jest.mock('../PromqlSection', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="promql-section" />,
}));

const renderQuerySection = (
	alertType: AlertTypes,
	queryCategory: EQueryType,
	alertDef: AlertDef,
): void => {
	render(
		<QuerySection
			queryCategory={queryCategory}
			setQueryCategory={jest.fn()}
			alertType={alertType}
			runQuery={jest.fn()}
			isLoadingQueries={false}
			handleCancelQuery={jest.fn()}
			alertDef={alertDef}
			panelType={PANEL_TYPES.TIME_SERIES}
			ruleId=""
		/>,
	);
};

describe('FormAlertRules QuerySection', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows only the AI Query Builder tab for an AI traces alert', () => {
		renderQuerySection(
			AlertTypes.AI_TRACES_BASED_ALERT,
			EQueryType.AI_QUERY_BUILDER,
			aiTraceAlertDefaults,
		);

		expect(screen.getByTestId('ai-query-builder-tab')).toBeInTheDocument();
		expect(screen.queryByTestId('query-builder-tab')).not.toBeInTheDocument();
		expect(screen.queryByTestId('clickhouse-tab')).not.toBeInTheDocument();
		expect(screen.queryByTestId('promql-tab')).not.toBeInTheDocument();
	});

	it('pins the AI Query Builder to traces', () => {
		renderQuerySection(
			AlertTypes.AI_TRACES_BASED_ALERT,
			EQueryType.AI_QUERY_BUILDER,
			aiTraceAlertDefaults,
		);

		expect(screen.getByTestId('query-builder-v2')).toBeInTheDocument();
		expect(mockQueryBuilderV2).toHaveBeenLastCalledWith(
			expect.objectContaining({
				config: expect.objectContaining({
					initialDataSource: DataSource.TRACES,
					queryVariant: 'static',
				}),
				showTraceOperator: false,
			}),
		);
		expect(mockQueryBuilderV2.mock.lastCall?.[0]).not.toHaveProperty(
			'signalSourceChangeEnabled',
		);
	});

	it('keeps the traces alert tabs without the AI tab', () => {
		renderQuerySection(
			AlertTypes.TRACES_BASED_ALERT,
			EQueryType.QUERY_BUILDER,
			traceAlertDefaults,
		);

		expect(screen.getByTestId('query-builder-tab')).toBeInTheDocument();
		expect(screen.getByTestId('clickhouse-tab')).toBeInTheDocument();
		expect(screen.queryByTestId('ai-query-builder-tab')).not.toBeInTheDocument();
	});

	it('keeps the metrics alert tabs without the AI tab', () => {
		renderQuerySection(
			AlertTypes.METRICS_BASED_ALERT,
			EQueryType.QUERY_BUILDER,
			alertDefaults,
		);

		expect(screen.getByTestId('query-builder-tab')).toBeInTheDocument();
		expect(screen.getByTestId('clickhouse-tab')).toBeInTheDocument();
		expect(screen.getByTestId('promql-tab')).toBeInTheDocument();
		expect(screen.queryByTestId('ai-query-builder-tab')).not.toBeInTheDocument();
	});
});
