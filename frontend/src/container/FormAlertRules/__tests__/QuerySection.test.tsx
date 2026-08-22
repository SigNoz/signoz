import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { AlertDef } from 'types/api/alerts/def';
import { EQueryType } from 'types/common/dashboard';

import QuerySection from '../QuerySection';

jest.mock('components/QueryBuilderV2/QueryBuilderV2', () => ({
	QueryBuilderV2: function MockQueryBuilderV2(): JSX.Element {
		return <div data-testid="query-builder-v2-mock">Query Builder V2</div>;
	},
}));

jest.mock(
	'../ChQuerySection',
	() =>
		function MockChQuerySection(): JSX.Element {
			return <div data-testid="ch-query-section-mock">ClickHouse Query</div>;
		},
);

jest.mock(
	'../PromqlSection',
	() =>
		function MockPromqlSection(): JSX.Element {
			return <div data-testid="promql-section-mock">PromQL</div>;
		},
);

jest.mock(
	'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn',
	() =>
		function MockRunQueryBtn(): JSX.Element {
			return <button type="button">Run Query</button>;
		},
);

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => false,
}));

jest.mock('api/common/logEvent', () => jest.fn());

const baseAlertDef: AlertDef = {
	alert: 'test-alert',
	condition: { compositeQuery: {} as never },
	version: 'v4',
};

interface RenderQuerySectionOverrides {
	alertType?: AlertTypes;
	queryCategory?: EQueryType;
	setQueryCategory?: jest.Mock;
}

const renderQuerySection = ({
	alertType = AlertTypes.METRICS_BASED_ALERT,
	queryCategory = EQueryType.QUERY_BUILDER,
	setQueryCategory = jest.fn(),
}: RenderQuerySectionOverrides = {}): ReturnType<typeof render> =>
	render(
		<QuerySection
			queryCategory={queryCategory}
			setQueryCategory={setQueryCategory}
			alertType={alertType}
			runQuery={jest.fn()}
			isLoadingQueries={false}
			handleCancelQuery={jest.fn()}
			alertDef={baseAlertDef}
			panelType={PANEL_TYPES.TIME_SERIES}
			ruleId=""
		/>,
	);

describe('FormAlertRules QuerySection', () => {
	// Regression coverage for https://github.com/SigNoz/signoz/issues/4914 —
	// Query Builder isn't backend-supported for Exceptions-based alerts (it
	// queries DataSource.TRACES instead of the exceptions index), so it must
	// stay disabled and any pre-existing rule stuck on it must be migrated
	// over to ClickHouse.

	it('disables the Query Builder tab for Exceptions-based alerts, and keeps ClickHouse enabled', () => {
		renderQuerySection({
			alertType: AlertTypes.EXCEPTIONS_BASED_ALERT,
			queryCategory: EQueryType.CLICKHOUSE,
		});

		const queryBuilderButton = screen.getByRole('button', {
			name: /query builder/i,
		});
		const clickHouseButton = screen.getByRole('button', {
			name: /clickhouse query/i,
		});

		expect(queryBuilderButton).toBeDisabled();
		expect(clickHouseButton).not.toBeDisabled();
	});

	it('does not switch tabs when the disabled Query Builder tab is clicked for an Exceptions alert', async () => {
		const setQueryCategory = jest.fn();
		renderQuerySection({
			alertType: AlertTypes.EXCEPTIONS_BASED_ALERT,
			queryCategory: EQueryType.CLICKHOUSE,
			setQueryCategory,
		});

		const queryBuilderButton = screen.getByRole('button', {
			name: /query builder/i,
		});

		await userEvent.click(queryBuilderButton);

		expect(setQueryCategory).not.toHaveBeenCalledWith(EQueryType.QUERY_BUILDER);
		expect(screen.getByTestId('ch-query-section-mock')).toBeInTheDocument();
	});

	it('leaves both tabs enabled for Traces-based alerts (unaffected by the Exceptions restriction)', () => {
		renderQuerySection({
			alertType: AlertTypes.TRACES_BASED_ALERT,
			queryCategory: EQueryType.QUERY_BUILDER,
		});

		const queryBuilderButton = screen.getByRole('button', {
			name: /query builder/i,
		});
		const clickHouseButton = screen.getByRole('button', {
			name: /clickhouse query/i,
		});

		expect(queryBuilderButton).not.toBeDisabled();
		expect(clickHouseButton).not.toBeDisabled();
	});

	it('migrates a rule previously saved with Query Builder over to ClickHouse when the alert type is Exceptions', async () => {
		const setQueryCategory = jest.fn();
		renderQuerySection({
			alertType: AlertTypes.EXCEPTIONS_BASED_ALERT,
			queryCategory: EQueryType.QUERY_BUILDER,
			setQueryCategory,
		});

		expect(setQueryCategory).toHaveBeenCalledWith(EQueryType.CLICKHOUSE);
		await expect(
			screen.findByTestId('ch-query-section-mock'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByTestId('query-builder-v2-mock')).not.toBeInTheDocument();
	});
});
