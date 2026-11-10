import {
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal,
	type Querybuildertypesv5QueryEnvelopeBuilderAIDTO,
	Querybuildertypesv5QueryEnvelopeBuilderAIDTOType,
	RuletypesAlertTypeDTO,
	RuletypesPanelTypeDTO,
	RuletypesQueryTypeDTO,
	type RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { alertRulesFixture } from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { mockNavigate } from 'tests/router-mocks';
import { render, screen, userEvent } from 'tests/test-utils';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import AlertRules from '../AlertRules';

const aiQueryEnvelope: Querybuildertypesv5QueryEnvelopeBuilderAIDTO = {
	type: Querybuildertypesv5QueryEnvelopeBuilderAIDTOType.builder_ai_query,
	spec: {
		name: 'A',
		signal:
			Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5TraceAggregationDTOSignal.traces,
		aggregations: [{ expression: 'count()' }],
	},
};

const aiRule: RuletypesRuleDTO = {
	...alertRulesFixture[0],
	alert: 'LLM Latency Alert',
	alertType: RuletypesAlertTypeDTO.AI_TRACES_BASED_ALERT,
	condition: {
		...alertRulesFixture[0].condition,
		compositeQuery: {
			queryType: RuletypesQueryTypeDTO.builder,
			panelType: RuletypesPanelTypeDTO.graph,
			queries: [aiQueryEnvelope],
		},
	},
};

describe('Home AlertRules', () => {
	it('opens an AI traces rule with its query in the AI slot', async () => {
		server.use(
			rest.get('http://localhost/api/v2/rules', (_, res, ctx) =>
				res(ctx.status(200), ctx.json({ data: [aiRule], status: 'success' })),
			),
		);
		const navigateSpy = mockNavigate();
		const user = userEvent.setup();

		render(
			<AlertRules
				onUpdateChecklistDoneItem={
					jest.fn() as jest.MockedFunction<(itemKey: string) => void>
				}
				loadingUserPreferences={false}
			/>,
		);
		await user.click(await screen.findByTestId(`home-alert-rule-${aiRule.id}`));

		const url = navigateSpy.mock.calls[0][0] as string;
		const params = new URLSearchParams(url.split('?')[1]);
		const query: Query = JSON.parse(
			decodeURIComponent(params.get(QueryParams.compositeQuery) as string),
		);
		expect(query.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(query.builder.queryData).toHaveLength(0);
		expect(query.builder_ai_query?.queryData[0].queryName).toBe('A');

		navigateSpy.mockRestore();
	});
});
