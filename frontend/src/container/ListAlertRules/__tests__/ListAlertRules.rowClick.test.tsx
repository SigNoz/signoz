import { safeNavigateMock } from '__tests__/safeNavigateMock';
import {
	RuletypesAlertTypeDTO,
	type RuletypesRuleConditionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { alertRulesFixture } from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, userEvent, waitFor } from 'tests/test-utils';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { renderListAlertRules } from './_helpers';

describe('ListAlertRules — row click navigation', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('clicking a row calls safeNavigate to alerts/overview with composite query + ruleId', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		const ruleCell = await screen.findByText('High CPU Alert');

		const td = ruleCell.closest('td');
		expect(td).not.toBeNull();
		await user.click(td as HTMLElement);

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});

		const [url] = safeNavigateMock.mock.calls[0];
		expect(url).toContain('/alerts/overview?');
		expect(url).toContain('ruleId=rule-1');
		expect(url).toContain('panelTypes=graph');
		expect(url).toContain('compositeQuery=');
	});

	it('ctrl+click on a row navigates with newTab option', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		const ruleCell = await screen.findByText('High CPU Alert');

		const td = ruleCell.closest('td');
		await user.keyboard('{Control>}');
		await user.click(td as HTMLElement);
		await user.keyboard('{/Control}');

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});

		const [url, options] = safeNavigateMock.mock.calls[0];
		expect(url).toContain('ruleId=rule-1');
		expect(options).toStrictEqual(expect.objectContaining({ newTab: true }));
	});

	it('opens an AI traces rule with its query in the AI slot', async () => {
		const aiRule = {
			...alertRulesFixture[0],
			alertType: RuletypesAlertTypeDTO.AI_TRACES_BASED_ALERT,
			condition: {
				compositeQuery: {
					queryType: 'builder',
					panelType: 'graph',
					queries: [
						{
							type: 'builder_ai_query',
							spec: {
								name: 'A',
								signal: 'traces',
								aggregations: [{ expression: 'count()' }],
							},
						},
					],
				},
			} as unknown as RuletypesRuleConditionDTO,
		};
		server.use(
			rest.get('http://localhost/api/v2/rules', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [aiRule], status: 'success' })),
			),
		);
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		const ruleCell = await screen.findByText('High CPU Alert');
		await user.click(ruleCell.closest('td') as HTMLElement);

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});

		const [url] = safeNavigateMock.mock.calls[0];
		const params = new URLSearchParams((url as string).split('?')[1]);
		const query: Query = JSON.parse(
			decodeURIComponent(params.get(QueryParams.compositeQuery) as string),
		);
		expect(query.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(query.builder.queryData).toHaveLength(0);
		expect(query.builder_ai_query?.queryData[0].queryName).toBe('A');
	});
});
