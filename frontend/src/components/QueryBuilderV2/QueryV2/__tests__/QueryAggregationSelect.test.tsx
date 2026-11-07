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
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

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

// Mirrors the backend: the trace context returns only aggregates; number drops the float64 ones.
const aiKeysFor = (
	params: URLSearchParams,
): TelemetrytypesTelemetryFieldKeyDTO[] => {
	if (params.get('fieldContext') === TelemetrytypesFieldContextDTO.trace) {
		return [totalTokens];
	}
	if (params.get('fieldDataType') === TelemetrytypesFieldDataTypeDTO.number) {
		return [durationNano];
	}
	return [durationNano, serviceName, totalTokens];
};

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

async function enterAggregation(text: string): Promise<void> {
	const user = userEvent.setup({ pointerEventsCheck: 0 });
	render(
		<QueryBuilderV2Provider>
			<QueryAggregationSelect queryData={aiQuery} />
		</QueryBuilderV2Provider>,
	);

	const content = (
		await screen.findByTestId(EDITOR_TEST_ID)
	).querySelector<HTMLElement>('.cm-content');
	if (!content) {
		throw new Error('CodeMirror content element not rendered');
	}
	await user.click(content);
	// Typed keys drop under load: a re-render's dispatch discards DOM input CodeMirror hasn't read yet.
	await user.paste(text);
	await user.keyboard('{Control>} {/Control}');
}

function suggestionLabels(): string[] {
	return Array.from(
		screen.getByTestId(EDITOR_TEST_ID).querySelectorAll('.cm-completionLabel'),
		(label) => label.textContent ?? '',
	).sort();
}

describe('QueryAggregationSelect field suggestions for an AI query', () => {
	it(
		'suggests numeric keys from the AI keys endpoint, with trace aggregates as trace.<name>',
		async () => {
			await enterAggregation('avg(');

			await waitFor(
				() =>
					expect(suggestionLabels()).toStrictEqual([
						'duration_nano',
						'trace.total_tokens',
					]),
				{ timeout: SUGGESTIONS_TIMEOUT_MS },
			);
			expect(keysRequests).toHaveLength(0);
			expect(
				aiKeysRequests
					.map((params) => ({
						signal: params.get('signal'),
						fieldDataType: params.get('fieldDataType'),
						fieldContext: params.get('fieldContext'),
					}))
					.sort((a, b) =>
						String(a.fieldContext).localeCompare(String(b.fieldContext)),
					),
			).toStrictEqual([
				{ signal: 'traces', fieldDataType: 'number', fieldContext: null },
				{ signal: 'traces', fieldDataType: null, fieldContext: 'trace' },
			]);
		},
		TEST_TIMEOUT_MS,
	);

	it(
		'keeps non-numeric keys for count_distinct',
		async () => {
			await enterAggregation('count_distinct(');

			await waitFor(
				() =>
					expect(suggestionLabels()).toStrictEqual([
						'duration_nano',
						'service.name',
						'trace.total_tokens',
					]),
				{ timeout: SUGGESTIONS_TIMEOUT_MS },
			);
		},
		TEST_TIMEOUT_MS,
	);
});
