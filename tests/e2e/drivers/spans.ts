import { randomSpanId, randomTraceId, type SeederSpan } from './traces';

/**
 * Pure span builders for the seeder. No page, no request: a feature seed builds
 * its spans here and posts them with `seedTracesViaSeeder`.
 *
 * Timestamps are relative to now (`agoMs`), because every page in scope opens on
 * a 15-30 minute window and the golden dataset sits at its edge.
 */

export const SPAN_KIND = {
	internal: 1,
	server: 2,
	client: 3,
	producer: 4,
	consumer: 5,
} as const;

export const STATUS = { unset: 0, ok: 1, error: 2 } as const;

/** `e2e-<feature>-w<worker>-<ms>`: the prefix every seeded name carries. */
export function stamp(feature: string, workerIndex: number): string {
	return `e2e-${feature}-w${workerIndex}-${Date.now()}`;
}

export interface SpanOptions {
	service: string;
	name: string;
	kind?: number;
	status?: number;
	statusMessage?: string;
	durationMs?: number;
	/** Start time, in ms before now. */
	agoMs?: number;
	attrs?: Record<string, unknown>;
	/** Extra resource attributes; `service.name` is set from `service`. */
	resources?: Record<string, string>;
	events?: SeederSpan['events'];
}

const DEFAULT_AGO_MS = 30_000;

function isoDuration(ms: number): string {
	return `PT${(ms / 1000).toFixed(6)}S`;
}

function build(
	opts: SpanOptions,
	traceId: string,
	parentSpanId: string | undefined,
	startMs: number,
): SeederSpan {
	const span: SeederSpan = {
		timestamp: new Date(startMs).toISOString(),
		trace_id: traceId,
		span_id: randomSpanId(),
		name: opts.name,
		kind: opts.kind ?? SPAN_KIND.server,
		status_code: opts.status ?? STATUS.ok,
		duration: isoDuration(opts.durationMs ?? 100),
		resources: { ...opts.resources, 'service.name': opts.service },
		attributes: opts.attrs ?? {},
	};
	if (opts.statusMessage) {
		span.status_message = opts.statusMessage;
	}
	if (parentSpanId) {
		span.parent_span_id = parentSpanId;
	}
	if (opts.events) {
		span.events = opts.events;
	}
	return span;
}

/** A root span in a fresh trace. Defaults to a SERVER span, OK, 100 ms. */
export function rootSpan(opts: SpanOptions): SeederSpan {
	return build(
		opts,
		randomTraceId(),
		undefined,
		Date.now() - (opts.agoMs ?? DEFAULT_AGO_MS),
	);
}

/**
 * A child of `parent` in the same trace. `offsetMs` is its start after the
 * parent's start; `agoMs` is ignored.
 */
export function childSpan(
	parent: SeederSpan,
	opts: SpanOptions & { offsetMs?: number },
): SeederSpan {
	return build(
		{ kind: SPAN_KIND.internal, ...opts },
		parent.trace_id,
		parent.span_id,
		Date.parse(parent.timestamp) + (opts.offsetMs ?? 10),
	);
}

export interface ClientCallOptions {
	service: string;
	/** Full URL, e.g. `https://api.example.com/v1/items`. */
	url: string;
	method?: string;
	/** HTTP status code attribute. */
	httpStatus?: number;
	status?: number;
	statusMessage?: string;
	durationMs?: number;
	agoMs?: number;
}

/**
 * A CLIENT span to an external host, the shape API monitoring reads. The fixture
 * derives `external_http_url` from `http.url`; `net.peer.name` is not mapped.
 */
export function clientCall(opts: ClientCallOptions): SeederSpan {
	const url = new URL(opts.url);
	const method = opts.method ?? 'GET';
	return rootSpan({
		service: opts.service,
		name: `${method} ${url.pathname}`,
		kind: SPAN_KIND.client,
		status: opts.status,
		statusMessage: opts.statusMessage,
		durationMs: opts.durationMs,
		agoMs: opts.agoMs,
		attrs: {
			'http.url': opts.url,
			'http.method': method,
			'http.host': url.host,
			'http.status_code': opts.httpStatus ?? 200,
		},
	});
}

export interface KafkaPairOptions {
	topic: string;
	partition: string;
	group: string;
	producer: string;
	consumer: string;
	consumerStatus?: number;
	bodySize?: number;
	agoMs?: number;
}

/** A kafka PRODUCER span and its CONSUMER child, in one trace. */
export function kafkaPair(opts: KafkaPairOptions): SeederSpan[] {
	const messaging = {
		'messaging.system': 'kafka',
		'messaging.destination.name': opts.topic,
		'messaging.destination.partition.id': opts.partition,
		'messaging.message.body.size': opts.bodySize ?? 512,
	};
	const producer = rootSpan({
		service: opts.producer,
		name: `${opts.topic} publish`,
		kind: SPAN_KIND.producer,
		durationMs: 20,
		agoMs: opts.agoMs,
		attrs: { ...messaging, 'messaging.client_id': `${opts.producer}-client` },
		resources: { 'service.instance.id': `${opts.producer}-0` },
	});
	const consumer = childSpan(producer, {
		service: opts.consumer,
		name: `${opts.topic} process`,
		kind: SPAN_KIND.consumer,
		status: opts.consumerStatus,
		durationMs: 40,
		offsetMs: 50,
		attrs: {
			...messaging,
			'messaging.kafka.consumer.group': opts.group,
			'messaging.client_id': `${opts.consumer}-client`,
		},
		resources: { 'service.instance.id': `${opts.consumer}-0` },
	});
	return [producer, consumer];
}

export interface CeleryTaskOptions {
	service: string;
	task: string;
	state: 'SUCCESS' | 'FAILURE' | 'RETRY';
	hostname: string;
	agoMs?: number;
}

/** A celery worker span (`run/<task>`), status 2 when the state is FAILURE. */
export function celeryTask(opts: CeleryTaskOptions): SeederSpan {
	return rootSpan({
		service: opts.service,
		name: `run/${opts.task}`,
		kind: SPAN_KIND.consumer,
		status: opts.state === 'FAILURE' ? STATUS.error : STATUS.ok,
		durationMs: 200,
		agoMs: opts.agoMs,
		attrs: {
			'messaging.destination': 'celery',
			'celery.task_name': opts.task,
			'celery.state': opts.state,
			'celery.hostname': opts.hostname,
			'celery.action': 'run',
		},
	});
}

export interface ExceptionSpanOptions {
	service: string;
	type: string;
	message: string;
	stack: string;
	name?: string;
	agoMs?: number;
}

/**
 * A SERVER span with status 2 and an `exception` event. The seeder writes the
 * event to the error index, which the exceptions pages read.
 */
export function exceptionSpan(opts: ExceptionSpanOptions): SeederSpan {
	const startMs = Date.now() - (opts.agoMs ?? DEFAULT_AGO_MS);
	return rootSpan({
		service: opts.service,
		name: opts.name ?? 'GET /fail',
		status: STATUS.error,
		agoMs: opts.agoMs,
		events: [
			{
				name: 'exception',
				timestamp: new Date(startMs + 10).toISOString(),
				attributes: {
					'exception.type': opts.type,
					'exception.message': opts.message,
					'exception.stacktrace': opts.stack,
					'exception.escaped': 'false',
				},
			},
		],
	});
}
