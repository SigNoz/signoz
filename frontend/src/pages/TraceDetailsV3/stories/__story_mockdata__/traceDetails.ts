/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	GetFlamegraph200,
	GetTraceAggregations200,
	GetTraceSummary200,
	GetWaterfallV4200,
	SpantypesFlamegraphSpanDTO,
	SpantypesSpanAggregationDTO,
	SpantypesWaterfallSpanDTO,
} from 'api/generated/services/sigNoz.schemas';
import { SpantypesSpanAggregationTypeDTO } from 'api/generated/services/sigNoz.schemas';
import type { GetSpanPercentilesResponseDataProps } from 'types/api/trace/getSpanPercentiles';
import type { RawRow } from 'types/api/v5/queryRange';

export const STORY_TRACE_ID = '4f2a6cbb9d3e17c0084bd42f9e7a1b33';

interface SpanTemplate {
	service: string;
	name: string;
	kind: string;
	failing?: boolean;
	/** The span the panel opens on when nothing fails. */
	focus?: boolean;
	/** `response_status_code`; failing spans default to 503, the rest to 200. */
	statusCode?: string;
	attributes: Record<string, string | number | boolean>;
}

/** Walked in order, so the tree keeps the same services at the same depths. */
const SPAN_TEMPLATES: SpanTemplate[] = [
	{
		service: 'frontend',
		name: 'HTTP GET /checkout',
		kind: 'Server',
		attributes: {
			'http.method': 'GET',
			'http.url': 'https://shop.signoz.io/checkout',
			'http.status_code': 200,
			'net.peer.name': 'shop.signoz.io',
		},
	},
	{
		service: 'checkout',
		name: 'POST /api/orders',
		kind: 'Server',
		attributes: {
			'http.method': 'POST',
			'http.route': '/api/orders',
			'http.status_code': 201,
			'messaging.system': 'kafka',
		},
	},
	{
		service: 'cart',
		name: 'GET /cart/items',
		kind: 'Client',
		attributes: {
			'http.method': 'GET',
			'http.route': '/cart/items',
			'http.status_code': 200,
		},
	},
	{
		service: 'payments',
		name: 'charge.authorize',
		kind: 'Client',
		failing: true,
		attributes: {
			'rpc.system': 'grpc',
			'rpc.method': 'Authorize',
			'payment.provider': 'stripe',
			'http.status_code': 503,
		},
	},
	{
		service: 'inventory',
		name: 'reserve.stock',
		kind: 'Client',
		attributes: { 'rpc.system': 'grpc', 'rpc.method': 'ReserveStock' },
	},
	{
		service: 'redis',
		name: 'GET cart:42',
		kind: 'Client',
		attributes: { 'db.system': 'redis', 'db.operation': 'GET' },
	},
	{
		service: 'postgres',
		name: 'SELECT orders',
		kind: 'Client',
		attributes: {
			'db.system': 'postgresql',
			'db.name': 'orders',
			'db.operation': 'SELECT',
			'db.statement': 'SELECT * FROM orders WHERE id = $1',
		},
	},
	{
		service: 'shipping',
		name: 'GET /rates',
		kind: 'Client',
		failing: true,
		attributes: {
			'http.method': 'GET',
			'http.route': '/rates',
			'http.status_code': 500,
		},
	},
	{
		service: 'notifications',
		name: 'email.send',
		kind: 'Producer',
		attributes: {
			'messaging.system': 'ses',
			'messaging.destination': 'order-confirmation',
		},
	},
	{
		service: 'auth',
		name: 'POST /token',
		kind: 'Client',
		attributes: { 'http.method': 'POST', 'http.route': '/token' },
	},
];

/** One span per badge colour, plus a span with no status code and so no badge. */
const STATUS_CODE_TEMPLATES: SpanTemplate[] = [
	['200', 'GET /status/ok'],
	['101', 'GET /ws/upgrade'],
	['201', 'POST /status/created'],
	['204', 'DELETE /status/no-content'],
	['301', 'GET /status/moved'],
	['304', 'GET /status/not-modified'],
	['400', 'POST /status/bad-request'],
	['401', 'GET /status/unauthorized'],
	['404', 'GET /status/not-found'],
	['429', 'GET /status/rate-limited'],
	['500', 'GET /status/internal-error'],
	['502', 'GET /status/bad-gateway'],
	['503', 'GET /status/unavailable'],
	['504', 'GET /status/timeout'],
	['', 'internal.compute'],
].map(([statusCode, name]): SpanTemplate => ({
	service: 'status-api',
	name,
	kind: statusCode ? 'Server' : 'Internal',
	failing: Number(statusCode) >= 500,
	statusCode,
	attributes: statusCode
		? {
				'http.method': name.split(' ')[0],
				'http.status_code': Number(statusCode),
			}
		: {},
}));

/**
 * An agent run: agent, LLM and tool spans, each badged by kind. The LLM spans
 * cover cache counted inside input (OpenAI), cache counted beside it
 * (Anthropic), reasoning, and an embedding with input only.
 */
const AI_TEMPLATES: SpanTemplate[] = [
	{
		service: 'support-agent',
		name: 'invoke_agent support-agent',
		kind: 'Internal',
		attributes: { 'gen_ai.agent.name': 'support-agent' },
	},
	{
		service: 'support-agent',
		name: 'chat gpt-4o',
		kind: 'Client',
		attributes: {
			'gen_ai.request.model': 'gpt-4o-2024-08-06',
			'gen_ai.usage.input_tokens': 1840,
			'gen_ai.usage.output_tokens': 212,
			'gen_ai.usage.cache_read.input_tokens': 1024,
			'gen_ai.usage.cache_creation.input_tokens': 0,
			'signoz.gen_ai.usage.tokens.cost': 0.00566,
		},
	},
	{
		service: 'support-agent',
		name: 'execute_tool search_docs',
		kind: 'Internal',
		attributes: { 'gen_ai.tool.name': 'search_docs' },
	},
	{
		service: 'support-agent',
		name: 'chat claude-sonnet-4',
		kind: 'Client',
		focus: true,
		attributes: {
			'gen_ai.request.model': 'claude-sonnet-4-20250514',
			'gen_ai.usage.input_tokens': 86,
			'gen_ai.usage.output_tokens': 640,
			'gen_ai.usage.cache_read.input_tokens': 4200,
			'gen_ai.usage.cache_creation.input_tokens': 1300,
			'signoz.gen_ai.usage.tokens.cost': 0.01853,
		},
	},
	{
		service: 'docs-api',
		name: 'GET /docs/search',
		kind: 'Server',
		attributes: {
			'http.method': 'GET',
			'http.route': '/docs/search',
			'http.status_code': 200,
		},
	},
	{
		service: 'support-agent',
		name: 'execute_tool fetch_ticket',
		kind: 'Internal',
		failing: true,
		attributes: { 'gen_ai.tool.name': 'fetch_ticket' },
	},
	{
		service: 'support-agent',
		name: 'invoke_agent triage-agent',
		kind: 'Internal',
		attributes: { 'gen_ai.agent.name': 'triage-agent' },
	},
	{
		service: 'support-agent',
		name: 'embeddings text-embedding-3-small',
		kind: 'Client',
		attributes: {
			'gen_ai.request.model': 'text-embedding-3-small',
			'gen_ai.usage.input_tokens': 312,
			'signoz.gen_ai.usage.tokens.cost': 0.00000624,
		},
	},
	{
		service: 'support-agent',
		name: 'chat o3-mini',
		kind: 'Client',
		attributes: {
			'gen_ai.request.model': 'o3-mini-2025-01-31',
			'gen_ai.usage.input_tokens': 920,
			'gen_ai.usage.output_tokens': 1480,
			'gen_ai.usage.reasoning.output_tokens': 1152,
			'signoz.gen_ai.usage.tokens.cost': 0.007524,
		},
	},
];

export const TRACE_SCENARIOS = ['checkout', 'status-codes', 'ai'] as const;

export type TraceScenario = (typeof TRACE_SCENARIOS)[number];

const SCENARIO_TEMPLATES: Record<TraceScenario, SpanTemplate[]> = {
	checkout: SPAN_TEMPLATES,
	'status-codes': STATUS_CODE_TEMPLATES,
	ai: AI_TEMPLATES,
};

/** Spans it takes for the scenario to show every template once. */
export const scenarioSpanCount = (scenario: TraceScenario): number =>
	SCENARIO_TEMPLATES[scenario].length;

const TRACE_SERVICES = [
	...new Set(SPAN_TEMPLATES.map(({ service }) => service)),
];

const ROOT_DURATION_MS = 1840;

/** A balanced binary tree, which gives every level more than one span. */
const parentIndexOf = (index: number): number => Math.floor((index - 1) / 2);

interface BuiltSpan {
	index: number;
	spanId: string;
	parentSpanId: string;
	level: number;
	startMs: number;
	durationMs: number;
	hasChildren: boolean;
	subTreeNodeCount: number;
	hasError: boolean;
	template: SpanTemplate;
}

interface TraceOptions {
	scenario: TraceScenario;
	spans: number;
	errors: boolean;
	/** Epoch milliseconds the root span starts at. */
	traceStart: number;
}

export const spanIdAt = (index: number): string =>
	`b17e${index.toString(16).padStart(12, '0')}`;

/**
 * The span the story opens the panel on: the scenario's focus span, else the
 * first failing one, so its events and error styling are on screen, and the
 * root when neither is in the trace.
 */
export const focusSpanIndex = (
	scenario: TraceScenario,
	spans: number,
): number => {
	const templates = SCENARIO_TEMPLATES[scenario];
	const focus = templates.findIndex((template) => template.focus);
	const failing = templates.findIndex((template) => template.failing);
	const index = focus >= 0 ? focus : failing;

	return index >= 0 && index < spans ? index : 0;
};

const buildSpans = ({
	scenario,
	spans,
	errors,
	traceStart,
}: TraceOptions): BuiltSpan[] => {
	const built: BuiltSpan[] = [];
	const templates = SCENARIO_TEMPLATES[scenario];

	for (let index = 0; index < spans; index += 1) {
		const template = templates[index % templates.length];
		const parent = index === 0 ? undefined : built[parentIndexOf(index)];
		// Children fit inside their parent's window, second child after the first,
		// so no span outlives its parent and no two siblings overlap.
		const durationMs = parent
			? Math.max(parent.durationMs * 0.42, 4)
			: ROOT_DURATION_MS;
		const offsetShare = index === 0 ? 0 : 0.05 + ((index - 1) % 2) * 0.5;

		built.push({
			index,
			spanId: spanIdAt(index),
			parentSpanId: parent ? parent.spanId : '',
			level: parent ? parent.level + 1 : 0,
			startMs: parent
				? parent.startMs + parent.durationMs * offsetShare
				: traceStart,
			durationMs,
			hasChildren: false,
			subTreeNodeCount: 0,
			hasError: errors && !!template.failing,
			template,
		});
	}

	built.forEach((span) => {
		if (span.index === 0) {
			return;
		}

		const parent = built[parentIndexOf(span.index)];
		parent.hasChildren = true;
	});

	// Descendant counts, cheapest bottom-up: a child is always built after its
	// parent, so one reverse pass is enough.
	[...built].reverse().forEach((span) => {
		if (span.index === 0) {
			return;
		}

		const parent = built[parentIndexOf(span.index)];
		parent.subTreeNodeCount += span.subTreeNodeCount + 1;
	});

	return built;
};

const eventsOf = (span: BuiltSpan): SpantypesWaterfallSpanDTO['events'] =>
	span.hasError
		? [
				{
					name: 'exception',
					timeUnixNano: Math.round(
						(span.startMs + span.durationMs * 0.8) * 1_000_000,
					),
					attributeMap: {
						'exception.type': 'UpstreamUnavailable',
						'exception.message': `${span.template.service} refused the request`,
					},
					isError: true,
				},
			]
		: [];

const resourceOf = (span: BuiltSpan): Record<string, string> => ({
	'service.name': span.template.service,
	'deployment.environment': 'production',
	'host.name': `ip-10-0-1-${20 + (span.index % 6)}`,
	'os.type': 'linux',
});

const waterfallSpan = (span: BuiltSpan): SpantypesWaterfallSpanDTO => ({
	span_id: span.spanId,
	trace_id: STORY_TRACE_ID,
	parent_span_id: span.parentSpanId,
	time_unix: Math.round(span.startMs),
	duration_nano: Math.round(span.durationMs * 1_000_000),
	name: span.template.name,
	kind_string: span.template.kind,
	has_error: span.hasError,
	status_code: span.hasError ? 2 : 1,
	status_code_string: span.hasError ? 'Error' : 'Ok',
	status_message: span.hasError ? 'upstream unavailable' : '',
	response_status_code:
		span.template.statusCode ?? (span.hasError ? '503' : '200'),
	has_children: span.hasChildren,
	sub_tree_node_count: span.subTreeNodeCount,
	level: span.level,
	attributes: span.template.attributes,
	resource: resourceOf(span),
	events: eventsOf(span),
	references: [],
	http_method: String(span.template.attributes['http.method'] ?? ''),
	http_url: String(span.template.attributes['http.url'] ?? ''),
	db_name: String(span.template.attributes['db.name'] ?? ''),
	db_operation: String(span.template.attributes['db.operation'] ?? ''),
	is_remote: span.level === 0 ? 'true' : 'false',
	flags: 0,
	trace_state: '',
});

/**
 * `totalSpansCount` equals what the response carries, which is what puts the
 * waterfall in its all-loaded mode: every parent expands and no further window
 * is fetched.
 */
export const traceWaterfallResponse = (
	options: TraceOptions & { missingSpans: boolean },
): GetWaterfallV4200 => {
	const spans = buildSpans(options);
	const root = spans[0];

	return {
		status: 'success',
		data: {
			spans: spans.map(waterfallSpan),
			hasMissingSpans: options.missingSpans,
			hasMore: false,
			uncollapsedSpans: spans
				.filter(({ hasChildren }) => hasChildren)
				.map(({ spanId }) => spanId),
			startTimestampMillis: Math.round(options.traceStart),
			endTimestampMillis: Math.round(options.traceStart + ROOT_DURATION_MS),
			totalSpansCount: spans.length,
			totalErrorSpansCount: spans.filter(({ hasError }) => hasError).length,
			rootServiceName: root?.template.service ?? '',
			rootServiceEntryPoint: root?.template.name ?? '',
		},
	};
};

const numberAttribute = (span: BuiltSpan, key: string): number =>
	Number(span.template.attributes[key] ?? 0);

/** The trace's AI totals, summed over its spans the way the backend does. */
const traceAiSummary = (
	spans: BuiltSpan[],
): GetTraceSummary200['data']['ai'] => {
	const aiSpans = spans.filter(({ template }) =>
		Object.keys(template.attributes).some((key) => key.includes('gen_ai.')),
	);

	if (aiSpans.length === 0) {
		return undefined;
	}

	const sum = (key: string): number =>
		aiSpans.reduce((total, span) => total + numberAttribute(span, key), 0);

	return {
		tokens: {
			input: sum('gen_ai.usage.input_tokens'),
			output: sum('gen_ai.usage.output_tokens'),
			cacheRead: sum('gen_ai.usage.cache_read.input_tokens'),
			cacheWrite: sum('gen_ai.usage.cache_creation.input_tokens'),
			reasoning: sum('gen_ai.usage.reasoning.output_tokens'),
		},
		totalCost: sum('signoz.gen_ai.usage.tokens.cost'),
	};
};

export const traceSummaryResponse = (
	options: TraceOptions & { missingSpans: boolean },
): GetTraceSummary200 => {
	const spans = buildSpans(options);
	const root = spans[0];

	return {
		status: 'success',
		data: {
			startTimestampMillis: Math.round(options.traceStart),
			endTimestampMillis: Math.round(options.traceStart + ROOT_DURATION_MS),
			rootServiceName: root?.template.service ?? '',
			rootServiceEntryPoint: root?.template.name ?? '',
			rootSpanStatusCode: root?.hasError ? '503' : '200',
			totalSpansCount: spans.length,
			totalErrorSpansCount: spans.filter(({ hasError }) => hasError).length,
			hasMissingSpans: options.missingSpans,
			ai: traceAiSummary(spans),
		},
	};
};

const flamegraphSpan = (span: BuiltSpan): SpantypesFlamegraphSpanDTO => ({
	spanId: span.spanId,
	parentSpanId: span.parentSpanId,
	name: span.template.name,
	timestamp: Math.round(span.startMs),
	durationNano: Math.round(span.durationMs * 1_000_000),
	hasError: span.hasError,
	level: span.level,
	attributes: span.template.attributes,
	resource: resourceOf(span),
	scope: { name: '', version: '', attributes: {} },
	event: [],
});

/** The flamegraph asks for its spans grouped by level, one array per level. */
export const traceFlamegraphResponse = (
	options: TraceOptions,
): GetFlamegraph200 => {
	const spans = buildSpans(options);
	const depth = Math.max(...spans.map(({ level }) => level), 0);

	return {
		status: 'success',
		data: {
			spans: Array.from({ length: depth + 1 }, (_, level) =>
				spans.filter((span) => span.level === level).map(flamegraphSpan),
			),
			hasMore: false,
			startTimestampMillis: Math.round(options.traceStart),
			endTimestampMillis: Math.round(options.traceStart + ROOT_DURATION_MS),
		},
	};
};

const aggregationValue = (
	aggregation: SpantypesSpanAggregationTypeDTO,
	spans: BuiltSpan[],
	fieldName: string,
): Record<string, number> => {
	const totals = new Map<string, number>();

	spans.forEach((span) => {
		const key =
			fieldName === 'name'
				? span.template.name
				: (resourceOf(span)[fieldName] ?? span.template.service);
		const previous = totals.get(key) ?? 0;

		totals.set(
			key,
			aggregation === SpantypesSpanAggregationTypeDTO.span_count
				? previous + 1
				: previous + span.durationMs * 1_000_000,
		);
	});

	if (
		aggregation !== SpantypesSpanAggregationTypeDTO.execution_time_percentage
	) {
		return Object.fromEntries(totals);
	}

	const sum = [...totals.values()].reduce((total, value) => total + value, 0);

	return Object.fromEntries(
		[...totals].map(([key, value]) => [
			key,
			sum === 0 ? 0 : Math.round((value / sum) * 1000) / 10,
		]),
	);
};

/** Answers per requested aggregation, keyed by the field the panel colours by. */
export const traceAggregationsResponse = (
	requested: SpantypesSpanAggregationDTO[],
	options: TraceOptions,
): GetTraceAggregations200 => {
	const spans = buildSpans(options);

	return {
		status: 'success',
		data: {
			aggregations: requested.map(({ aggregation, field }) => ({
				aggregation,
				field,
				value: aggregationValue(aggregation, spans, field.name),
			})),
		},
	};
};

export const spanPercentilesResponse = (): {
	status: string;
	data: GetSpanPercentilesResponseDataProps;
} => ({
	status: 'success',
	data: {
		percentiles: {
			p50: 412_000_000,
			p90: 1_024_000_000,
			p95: 1_380_000_000,
			p99: 1_910_000_000,
		},
		position: {
			percentile: 92,
			description: 'Slower than 92% of spans with the same name',
		},
	},
});

const LOG_BODIES = [
	'authorizing charge for order 4821',
	'upstream stripe call returned 503',
	'retrying charge in 200ms',
	'reserving stock for 3 line items',
	'cart 42 loaded from cache',
	'order 4821 written to orders',
];

/**
 * Which of the panel's log queries is asking: the span's own logs, the context
 * above or below them, or the whole trace when the span has none.
 */
const SPAN_LOG_SCOPES = ['span', 'before', 'after', 'trace'] as const;

export type SpanLogScope = (typeof SPAN_LOG_SCOPES)[number];

const SCOPE_OFFSET_MS: Record<SpanLogScope, number> = {
	before: -ROOT_DURATION_MS,
	span: 0,
	after: ROOT_DURATION_MS,
	trace: 0,
};

/**
 * The Logs tab of the span panel, answered on the raw query_range shape. Each
 * scope answers with its own ids and window, so the panel stacks the span's
 * logs between their context instead of showing one set three times. The rows
 * sit inside the trace's window rather than the request's, because the span-log
 * queries ask in microseconds while a row's timestamp is a date.
 */
export const spanLogRows = (
	count: number,
	options: TraceOptions,
	scope: SpanLogScope,
): RawRow[] => {
	const step = ROOT_DURATION_MS / Math.max(count, 1);
	const spans = buildSpans(options);
	const focus = spans[focusSpanIndex(options.scenario, options.spans)];

	return Array.from({ length: count }, (_, index) => {
		const at = options.traceStart + SCOPE_OFFSET_MS[scope] + index * step;
		const span = scope === 'span' ? focus : spans[index % spans.length];

		return {
			timestamp: new Date(at).toISOString(),
			data: {
				body: LOG_BODIES[index % LOG_BODIES.length],
				id: `storybook-${scope}-log-${index + 1}`,
				trace_id: STORY_TRACE_ID,
				span_id: span?.spanId ?? '',
				severity_text: index % 4 === 1 ? 'ERROR' : 'INFO',
				severity_number: index % 4 === 1 ? 17 : 9,
				attributes_string: {
					'service.name': span?.template.service ?? '',
				},
				resources_string: {
					'service.name': span?.template.service ?? '',
				},
				scope_name: '',
			},
		};
	});
};

/**
 * Span ids for the header's span search. Every span answers, so a filter typed
 * in the story highlights the whole trace rather than nothing.
 */
export const spanMatchRows = (options: TraceOptions): RawRow[] =>
	buildSpans(options).map((span) => ({
		timestamp: new Date(span.startMs).toISOString(),
		data: {
			span_id: span.spanId,
			spanID: span.spanId,
			timestamp: Math.round(span.startMs * 1_000_000),
		},
	}));

const TRACE_FIELD_KEYS = [
	'service.name',
	'name',
	'duration_nano',
	'http.method',
	'http.status_code',
	'db.system',
	'rpc.method',
	'deployment.environment',
	'host.name',
	'status_code_string',
];

export const traceDetailFieldKeys = (searchText: string | null): string[] => {
	const search = (searchText ?? '').toLowerCase();

	return search
		? TRACE_FIELD_KEYS.filter((key) => key.toLowerCase().includes(search))
		: TRACE_FIELD_KEYS;
};

const FIELD_VALUES: Record<string, string[]> = {
	'service.name': TRACE_SERVICES,
	name: SPAN_TEMPLATES.map(({ name }) => name),
	'http.method': ['GET', 'POST'],
	'http.status_code': ['200', '201', '500', '503'],
	'db.system': ['postgresql', 'redis'],
	'rpc.method': ['Authorize', 'ReserveStock'],
	'deployment.environment': ['production', 'staging'],
	status_code_string: ['Ok', 'Error'],
};

export const traceDetailFieldValues = (name: string | null): string[] =>
	FIELD_VALUES[name ?? ''] ?? [];
