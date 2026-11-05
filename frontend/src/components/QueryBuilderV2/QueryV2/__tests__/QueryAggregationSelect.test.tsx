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

const aiKeysResponse: GetAIObservabilityFieldsKeys200 = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			duration_nano: [durationNano],
			'service.name': [
				fieldKey(
					'service.name',
					TelemetrytypesFieldContextDTO.resource,
					TelemetrytypesFieldDataTypeDTO.string,
				),
			],
			total_tokens: [
				fieldKey(
					'total_tokens',
					TelemetrytypesFieldContextDTO.trace,
					TelemetrytypesFieldDataTypeDTO.float64,
				),
			],
		},
	},
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
				return res(ctx.status(200), ctx.json(aiKeysResponse));
			},
		),
		rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/keys`, (req, res, ctx) => {
			keysRequests.push(req.url.searchParams);
			return res(ctx.status(200), ctx.json(keysResponse));
		}),
	);
});

async function typeAggregation(text: string): Promise<void> {
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
	await user.type(content, text);
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
			await typeAggregation('avg(');

			await waitFor(
				() =>
					expect(suggestionLabels()).toStrictEqual([
						'duration_nano',
						'trace.total_tokens',
					]),
				{ timeout: SUGGESTIONS_TIMEOUT_MS },
			);
			expect(keysRequests).toHaveLength(0);
			expect(aiKeysRequests).toHaveLength(1);
			expect(aiKeysRequests[0].get('signal')).toBe('traces');
			expect(aiKeysRequests[0].get('fieldDataType')).toBeNull();
		},
		TEST_TIMEOUT_MS,
	);

	it(
		'keeps non-numeric keys for count_distinct',
		async () => {
			await typeAggregation('count_distinct(');

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
