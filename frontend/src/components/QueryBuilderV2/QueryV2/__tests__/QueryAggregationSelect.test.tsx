import {
	GetAIObservabilityFieldsKeys200,
	GetFieldsKeys200,
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesSignalDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { ENVIRONMENT } from 'constants/env';
import { initialQueriesMap } from 'constants/queryBuilder';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor, within } from 'tests/test-utils';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import { QueryBuilderV2Provider } from '../../QueryBuilderV2Context';
import QueryAggregationSelect from '../QueryAggregation/QueryAggregationSelect';
import { mockCodeMirrorDomApis } from './codemirrorDomMocks';

const EDITOR_TEST_ID = 'query-aggregation-editor';
// CodeMirror's suggestion popup is slow to open under a parallel jest run.
const SUGGESTIONS_TIMEOUT_MS = 5000;
const TEST_TIMEOUT_MS = 15000;

const fieldKey = (
	name: string,
	fieldContext: TelemetrytypesFieldContextDTO,
	fieldDataType: TelemetrytypesFieldDataTypeDTO,
): TelemetrytypesTelemetryFieldKeyDTO => ({
	name,
	fieldContext,
	fieldDataType,
	signal: TelemetrytypesSignalDTO.traces,
});

const durationNano = fieldKey(
	'duration_nano',
	TelemetrytypesFieldContextDTO.span,
	TelemetrytypesFieldDataTypeDTO.float64,
);

const serviceName = fieldKey(
	'service.name',
	TelemetrytypesFieldContextDTO.resource,
	TelemetrytypesFieldDataTypeDTO.string,
);

const totalTokens = fieldKey(
	'total_tokens',
	TelemetrytypesFieldContextDTO.trace,
	TelemetrytypesFieldDataTypeDTO.float64,
);

const aiKeysResponse = (
	keys: TelemetrytypesTelemetryFieldKeyDTO[],
): GetAIObservabilityFieldsKeys200 => ({
	status: 'success',
	data: {
		complete: true,
		keys: Object.fromEntries(keys.map((key) => [key.name, [key]])),
	},
});

// Assumes the AI endpoint's number filter also returns the float64 trace aggregates.
const aiKeysFor = (
	params: URLSearchParams,
): TelemetrytypesTelemetryFieldKeyDTO[] =>
	params.get('fieldDataType') === TelemetrytypesFieldDataTypeDTO.number
		? [durationNano, totalTokens]
		: [durationNano, serviceName, totalTokens];

const keysResponse: GetFieldsKeys200 = {
	status: 'success',
	data: { complete: true, keys: { duration_nano: [durationNano] } },
};

const aiQuery: IBuilderQuery = {
	...(initialQueriesMap.traces.builder.queryData[0] as IBuilderQuery),
	builderQueryType: 'builder_ai_query',
	aggregations: [],
};

const aiKeysRequests: URLSearchParams[] = [];
const keysRequests: URLSearchParams[] = [];

beforeAll(() => {
	mockCodeMirrorDomApis();
});

beforeEach(() => {
	aiKeysRequests.length = 0;
	keysRequests.length = 0;
	server.use(
		rest.get(
			`${ENVIRONMENT.baseURL}/api/v1/ai_observability/fields/keys`,
			(req, res, ctx) => {
				aiKeysRequests.push(req.url.searchParams);
				return res(
					ctx.status(200),
					ctx.json(aiKeysResponse(aiKeysFor(req.url.searchParams))),
				);
			},
		),
		rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/keys`, (req, res, ctx) => {
			keysRequests.push(req.url.searchParams);
			return res(ctx.status(200), ctx.json(keysResponse));
		}),
	);
});

async function enterAggregation(
	text: string,
	queryData: IBuilderQuery = aiQuery,
	currentQuery?: Query,
): Promise<void> {
	const user = userEvent.setup();
	render(
		<QueryBuilderV2Provider>
			<QueryAggregationSelect queryData={queryData} />
		</QueryBuilderV2Provider>,
		undefined,
		{ queryBuilderOverrides: currentQuery && { currentQuery } },
	);

	const content = within(await screen.findByTestId(EDITOR_TEST_ID)).getByRole(
		'textbox',
	);
	await user.click(content);
	// Typed keys drop under load: a re-render's dispatch discards DOM input CodeMirror hasn't read yet.
	await user.paste(text);
	await user.keyboard('{Control>} {/Control}');
}

function suggestionLabels(): string[] {
	return within(screen.getByTestId(EDITOR_TEST_ID))
		.queryAllByRole('option')
		.map((option) => option.textContent ?? '')
		.sort();
}

describe('QueryAggregationSelect field suggestions for an AI query', () => {
	it.each([
		{
			aggregation: 'avg(',
			fieldDataType: TelemetrytypesFieldDataTypeDTO.number,
			labels: ['duration_nano', 'trace.total_tokens'],
		},
		{
			aggregation: 'count_distinct(',
			fieldDataType: null,
			labels: ['duration_nano', 'service.name', 'trace.total_tokens'],
		},
	])(
		'suggests keys from the AI keys endpoint, with trace aggregates as trace.<name>, for $aggregation',
		async ({ aggregation, fieldDataType, labels }) => {
			await enterAggregation(aggregation);

			await waitFor(() => expect(suggestionLabels()).toStrictEqual(labels), {
				timeout: SUGGESTIONS_TIMEOUT_MS,
			});
			expect(keysRequests).toHaveLength(0);
			expect(
				aiKeysRequests.map((params) => ({
					signal: params.get('signal'),
					fieldDataType: params.get('fieldDataType'),
					fieldContext: params.get('fieldContext'),
				})),
			).toStrictEqual([{ signal: 'traces', fieldDataType, fieldContext: null }]);
		},
		TEST_TIMEOUT_MS,
	);

	it(
		'uses the AI keys endpoint for an untagged query on the AI query type',
		async () => {
			await enterAggregation(
				'avg(',
				{ ...aiQuery, builderQueryType: undefined },
				{ ...initialQueriesMap.traces, queryType: EQueryType.AI_QUERY_BUILDER },
			);

			await waitFor(
				() =>
					expect(suggestionLabels()).toStrictEqual([
						'duration_nano',
						'trace.total_tokens',
					]),
				{ timeout: SUGGESTIONS_TIMEOUT_MS },
			);
			expect(keysRequests).toHaveLength(0);
		},
		TEST_TIMEOUT_MS,
	);
});
