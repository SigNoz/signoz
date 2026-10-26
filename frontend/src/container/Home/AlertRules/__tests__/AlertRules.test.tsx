import {
	RuletypesAlertTypeDTO,
	type RuletypesRuleConditionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import history from 'lib/history';
import { alertRulesFixture } from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent } from 'tests/test-utils';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import AlertRules from '../AlertRules';

jest.mock('api/common/logEvent', () => jest.fn());

const aiRule = {
	...alertRulesFixture[0],
	alert: 'LLM Latency Alert',
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

describe('Home AlertRules', () => {
	it('opens an AI traces rule with its query in the AI slot', async () => {
		server.use(
			rest.get('http://localhost/api/v2/rules', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [aiRule], status: 'success' })),
			),
		);
		const pushSpy = jest.spyOn(history, 'push').mockImplementation(() => {});
		const user = userEvent.setup();

		render(
			<AlertRules
				onUpdateChecklistDoneItem={
					jest.fn() as jest.MockedFunction<(itemKey: string) => void>
				}
				loadingUserPreferences={false}
			/>,
		);
		await user.click(await screen.findByText('LLM Latency Alert'));

		const url = pushSpy.mock.calls[0][0] as string;
		const params = new URLSearchParams(url.split('?')[1]);
		const query: Query = JSON.parse(
			decodeURIComponent(params.get(QueryParams.compositeQuery) as string),
		);
		expect(query.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(query.builder.queryData).toHaveLength(0);
		expect(query.builder_ai_query?.queryData[0].queryName).toBe('A');

		pushSpy.mockRestore();
	});
});
