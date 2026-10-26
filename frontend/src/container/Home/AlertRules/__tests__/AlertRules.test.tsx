import { fireEvent, screen } from '@testing-library/react';
import { useListRules } from 'api/generated/services/rules';
import {
	RuletypesAlertTypeDTO,
	type RuletypesRuleConditionDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import history from 'lib/history';
import { alertRulesFixture } from 'mocks-server/__mockdata__/alert_rules';
import { render } from 'tests/test-utils';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import AlertRules from '../AlertRules';

jest.mock('api/common/logEvent', () => jest.fn());
jest.mock('api/generated/services/rules', () => ({
	useListRules: jest.fn(),
}));

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
	it('opens an AI traces rule with its query in the AI slot', () => {
		(useListRules as jest.Mock).mockReturnValue({
			data: { data: [aiRule] },
			isError: false,
			isLoading: false,
		});
		const pushSpy = jest.spyOn(history, 'push').mockImplementation(() => {});

		render(
			<AlertRules
				onUpdateChecklistDoneItem={jest.fn()}
				loadingUserPreferences={false}
			/>,
		);
		fireEvent.click(screen.getByText('LLM Latency Alert'));

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
