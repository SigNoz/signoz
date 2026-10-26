import { PANEL_TYPES } from 'constants/queryBuilder';
import { INITIAL_ALERT_THRESHOLD_STATE } from 'container/CreateAlertV2/context/constants';
import { RuletypesAlertTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';
import { buildCreateThresholdAlertRulePayload } from 'container/CreateAlertV2/Footer/utils';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { QueryEnvelope } from 'types/api/v5/queryRange';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';

import { getEditAlertQuery, toEditAlertQuery } from '../utils';

const savedQuery = (
	type: 'builder_query' | 'builder_ai_query',
): ICompositeMetricQuery => ({
	queryType: EQueryType.QUERY_BUILDER,
	panelType: PANEL_TYPES.TIME_SERIES,
	unit: undefined,
	queries: [
		{
			type,
			spec: {
				name: 'A',
				signal: 'traces',
				aggregations: [{ expression: 'count()' }],
			},
		} as QueryEnvelope,
	],
});

describe('getEditAlertQuery', () => {
	it('opens a saved AI traces alert in the AI slot', () => {
		const query = getEditAlertQuery(
			savedQuery('builder_ai_query'),
			AlertTypes.AI_TRACES_BASED_ALERT,
		);

		expect(query.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(query.builder.queryData).toHaveLength(0);
		expect(query.builder_ai_query?.queryData[0]).toMatchObject({
			queryName: 'A',
			dataSource: DataSource.TRACES,
			builderQueryType: 'builder_ai_query',
		});
	});

	it('opens a saved traces alert unchanged', () => {
		const query = getEditAlertQuery(
			savedQuery('builder_query'),
			AlertTypes.TRACES_BASED_ALERT,
		);

		expect(query.queryType).toBe(EQueryType.QUERY_BUILDER);
		expect(query.builder.queryData[0].queryName).toBe('A');
		expect(query.builder_ai_query).toBeUndefined();
	});

	it('saves an unchanged AI traces alert back as builder_ai_query envelopes', () => {
		const state = createMockAlertContextState();
		const payload = buildCreateThresholdAlertRulePayload({
			alertType: AlertTypes.AI_TRACES_BASED_ALERT,
			basicAlertState: state.alertState,
			thresholdState: INITIAL_ALERT_THRESHOLD_STATE,
			advancedOptions: state.advancedOptions,
			evaluationWindow: state.evaluationWindow,
			notificationSettings: state.notificationSettings,
			query: getEditAlertQuery(
				savedQuery('builder_ai_query'),
				AlertTypes.AI_TRACES_BASED_ALERT,
			),
		});

		expect(payload.condition.compositeQuery.queryType).toBe(
			EQueryType.QUERY_BUILDER,
		);
		expect(payload.condition.compositeQuery.queries).toStrictEqual([
			expect.objectContaining({
				type: 'builder_ai_query',
				spec: expect.objectContaining({ name: 'A', signal: 'traces' }),
			}),
		]);
	});
});

describe('toEditAlertQuery', () => {
	it('moves a saved AI traces rule into the AI slot', () => {
		const query = toEditAlertQuery(
			mapQueryDataFromApi(savedQuery('builder_ai_query')),
			RuletypesAlertTypeDTO.AI_TRACES_BASED_ALERT,
		);

		expect(query.queryType).toBe(EQueryType.AI_QUERY_BUILDER);
		expect(query.builder.queryData).toHaveLength(0);
		expect(query.builder_ai_query?.queryData[0].queryName).toBe('A');
	});

	it('leaves a saved traces rule unchanged', () => {
		const mapped = mapQueryDataFromApi(savedQuery('builder_query'));

		expect(
			toEditAlertQuery(mapped, RuletypesAlertTypeDTO.TRACES_BASED_ALERT),
		).toBe(mapped);
	});
});
