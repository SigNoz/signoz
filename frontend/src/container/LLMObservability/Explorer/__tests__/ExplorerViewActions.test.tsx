import { ENVIRONMENT } from 'constants/env';
import { initialQueryAIWithType, PANEL_TYPES } from 'constants/queryBuilder';
import { rest, server } from 'mocks-server/server';
import { render, screen } from 'tests/test-utils';
import { DataSource } from 'types/common/queryBuilder';

import ListView from '../ListView/ListView';
import TableView from '../TableView/TableView';
import TimeSeriesView from '../TimeSeriesView/TimeSeriesView';
import TracesView from '../TracesView/TracesView';

const QUERY_RANGE_URL = `${ENVIRONMENT.baseURL}/api/v5/query_range`;

const VIEWS: [PANEL_TYPES, () => JSX.Element][] = [
	[
		PANEL_TYPES.LIST,
		(): JSX.Element => (
			<ListView
				isFilterApplied={false}
				setWarning={jest.fn()}
				setIsLoadingQueries={jest.fn()}
			/>
		),
	],
	[
		PANEL_TYPES.TRACE,
		(): JSX.Element => (
			<TracesView
				isFilterApplied={false}
				setWarning={jest.fn()}
				setIsLoadingQueries={jest.fn()}
			/>
		),
	],
	[
		PANEL_TYPES.TIME_SERIES,
		(): JSX.Element => (
			<TimeSeriesView
				dataSource={DataSource.TRACES}
				isFilterApplied={false}
				setWarning={jest.fn()}
				setIsLoadingQueries={jest.fn()}
			/>
		),
	],
	[
		PANEL_TYPES.TABLE,
		(): JSX.Element => (
			<TableView setWarning={jest.fn()} setIsLoadingQueries={jest.fn()} />
		),
	],
];

describe('AI explorer views', () => {
	beforeEach(() => {
		server.use(
			rest.post(QUERY_RANGE_URL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: { data: { results: [] } } })),
			),
		);
	});

	it.each(VIEWS)(
		'%s: offers Create an alert and Add to dashboard for the staged query, before data arrives',
		(panelType, renderView) => {
			render(
				renderView(),
				{},
				{
					queryBuilderOverrides: {
						panelType,
						stagedQuery: initialQueryAIWithType,
						currentQuery: initialQueryAIWithType,
					},
				},
			);

			expect(screen.getByTestId('explorer-create-alert')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
			expect(screen.getByTestId('explorer-add-to-dashboard')).not.toHaveAttribute(
				'aria-disabled',
				'true',
			);
		},
	);
});
