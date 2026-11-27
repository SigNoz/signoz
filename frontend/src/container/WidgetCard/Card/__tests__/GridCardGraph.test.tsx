import { prepareQueryRangePayloadV5 } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';
import { Widgets } from 'types/api/widgets/widget';
import { DataSource } from 'types/common/queryBuilder';

import GridCardGraph from '../index';

jest.mock('lib/dashboard/getQueryResults', () => ({
	...jest.requireActual('lib/dashboard/getQueryResults'),
	GetMetricQueryRange: jest.fn(() => new Promise(() => {})),
}));

jest.mock('hooks/useIntersectionObserver', () => ({
	useIntersectionObserver: (): boolean => true,
}));

const emptyResponse: MetricQueryRangeSuccessResponse = {
	statusCode: 200,
	error: null,
	message: 'success',
	payload: {
		data: {
			result: [],
			resultType: '',
			newResult: { data: { result: [], resultType: '' } },
		},
	},
};

const widgetFiltering = (
	expression: string,
	dataSource: DataSource = DataSource.TRACES,
	panelTypes: PANEL_TYPES = PANEL_TYPES.TIME_SERIES,
): Widgets => {
	const query = initialQueriesMap[dataSource];
	return getWidgetQueryBuilder({
		id: 'panel',
		panelTypes,
		query: {
			...query,
			builder: {
				...query.builder,
				queryData: [{ ...query.builder.queryData[0], filter: { expression } }],
			},
		},
	});
};

const lastRequestedLimit = (): number | undefined => {
	const [request] = jest.mocked(GetMetricQueryRange).mock.calls.at(-1) ?? [];
	if (!request) {
		return undefined;
	}
	const [query] =
		prepareQueryRangePayloadV5(request).queryPayload.compositeQuery.queries;
	return 'limit' in query.spec ? query.spec.limit : undefined;
};

const requestedFilters = (): (string | undefined)[] =>
	jest
		.mocked(GetMetricQueryRange)
		.mock.calls.map(
			([props]) => props.query.builder.queryData[0].filter?.expression,
		);

describe('GridCardGraph', () => {
	it.each([
		{
			when: 'it is enabled together with a new query',
			enabledBefore: false,
			expected: ["name in ['GET /']"],
		},
		{
			when: 'its query changes while enabled',
			enabledBefore: true,
			expected: ['name in []', "name in ['GET /']"],
		},
	])(
		'does not resend the previous query when $when',
		async ({ enabledBefore, expected }) => {
			const { rerender } = render(
				<GridCardGraph
					widget={widgetFiltering('name in []')}
					isQueryEnabled={enabledBefore}
				/>,
			);

			rerender(
				<GridCardGraph
					widget={widgetFiltering("name in ['GET /']")}
					isQueryEnabled
				/>,
			);

			await waitFor(() =>
				expect(requestedFilters()).toContain("name in ['GET /']"),
			);
			expect(requestedFilters()).toStrictEqual(expected);
		},
	);

	it('keeps the logs page size the user picked when the query changes', async () => {
		jest.mocked(GetMetricQueryRange).mockResolvedValue(emptyResponse);
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const logsList = (expression: string): Widgets =>
			widgetFiltering(expression, DataSource.LOGS, PANEL_TYPES.LIST);

		const { rerender } = render(
			<GridCardGraph widget={logsList("severity_text = 'ERROR'")} />,
		);

		await user.click(
			within(await screen.findByTestId('controls-page-size')).getByRole(
				'combobox',
			),
		);
		await user.click(await screen.findByText('50 / page'));
		await waitFor(() => expect(lastRequestedLimit()).toBe(50));

		rerender(<GridCardGraph widget={logsList("severity_text = 'WARN'")} />);

		await waitFor(() =>
			expect(requestedFilters()).toContain("severity_text = 'WARN'"),
		);
		expect(lastRequestedLimit()).toBe(50);
	}, 15000);
});
