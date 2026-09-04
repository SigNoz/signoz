/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { EXCEPTION_CATALOGUE } from 'pages/AllErrors/__story_mockdata__/exceptions';
import type { ExceptionShape } from 'pages/AllErrors/__story_mockdata__/exceptions';
import type { PayloadProps as ErrorEvent } from 'types/api/errors/getByErrorTypeAndService';
import type { PayloadProps as NextPrevIds } from 'types/api/errors/getNextPrevId';

export const EXCEPTION_LANGUAGES = ['go', 'python', 'java'] as const;

export type ExceptionLanguage = (typeof EXCEPTION_LANGUAGES)[number];

export const NEIGHBOUR_STATES = [
	'surrounded',
	'oldest',
	'newest',
	'only-event',
] as const;

export type NeighbourState = (typeof NEIGHBOUR_STATES)[number];

/** The three parameter sets the page distinguishes, in the order it reads them. */
export const DETAIL_PARAMS = ['group', 'event', 'no-timestamp'] as const;

export type DetailParams = (typeof DETAIL_PARAMS)[number];

/**
 * The three events the group holds, oldest first. Both lookups key on the
 * timestamp, so walking with Older and Newer, which is the page rewriting the
 * `timestamp` param, is what moves between them.
 */
const WALK = ['older', 'event', 'newer'] as const;

type Step = (typeof WALK)[number];

/** RFC 3339 as the payload carries it, and the nanoseconds the URL carries. */
const STEP_TIMESTAMPS: Record<Step, { at: string; nanos: string }> = {
	older: { at: '2025-04-14T18:11:04.113904221Z', nanos: '1744654264113904221' },
	event: { at: '2025-04-14T18:27:57.797616374Z', nanos: '1744655277797616374' },
	newer: { at: '2025-04-14T18:44:12.550118903Z', nanos: '1744656252550118903' },
};

const stepAt = (nanos: string | null): Step =>
	WALK.find((step) => STEP_TIMESTAMPS[step].nanos === nanos) ?? 'event';

const eventIdAt = (step: Step, errorId: string): string =>
	step === 'event' ? errorId : `${step}-${errorId}`;

const STACK_TRACES: Record<ExceptionLanguage, string> = {
	go: `*errors.errorString: redis timeout
goroutine 51 [running]:
github.com/signoz/sample/pkg/cache.(*Client).Get(0xc000112a80, {0x1096f40, 0xc0001a2000}, {0xf8a3c1, 0x11})
\t/app/pkg/cache/client.go:118 +0x2c5
github.com/signoz/sample/pkg/orders.(*Service).Lookup(0xc0000b8060, {0x1096f40, 0xc0001a2000}, 0x1f4)
\t/app/pkg/orders/service.go:64 +0x11f
github.com/signoz/sample/internal/http.(*Handler).ServeHTTP(0xc0000ba018, {0x1094e80, 0xc00019c0e0}, 0xc0001c4000)
\t/app/internal/http/handler.go:41 +0x1a8
net/http.serverHandler.ServeHTTP({0xc00018e000}, {0x1094e80, 0xc00019c0e0}, 0xc0001c4000)
\t/usr/local/go/src/net/http/server.go:2938 +0x8e`,
	python: `Traceback (most recent call last):
  File "/usr/local/lib/python3.11/site-packages/urllib3/connectionpool.py", line 715, in urlopen
    httplib_response = self._make_request(
  File "/usr/local/lib/python3.11/site-packages/urllib3/connectionpool.py", line 467, in _make_request
    raise ReadTimeoutError(self, url, "Read timed out")
urllib3.exceptions.ReadTimeoutError: HTTPConnectionPool(host='payments', port=8080): Read timed out. (read timeout=2)

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/app/checkout/views.py", line 82, in place_order
    response = session.post(f"{PAYMENTS_URL}/charge", json=payload, timeout=2)
  File "/usr/local/lib/python3.11/site-packages/requests/sessions.py", line 637, in post
    return self.request("POST", url, data=data, json=json, **kwargs)
requests.exceptions.ConnectionError: HTTPConnectionPool(host='payments', port=8080): Read timed out. (read timeout=2)`,
	java: `java.net.SocketTimeoutException: Read timed out
\tat java.base/java.net.SocketInputStream.socketRead0(Native Method)
\tat java.base/java.net.SocketInputStream.read(SocketInputStream.java:168)
\tat okhttp3.internal.http1.Http1ExchangeCodec.readResponseHeaders(Http1ExchangeCodec.kt:180)
\tat okhttp3.internal.connection.Exchange.readResponseHeaders(Exchange.kt:106)
\tat io.signoz.sample.payment.GatewayClient.authorize(GatewayClient.java:74)
\tat io.signoz.sample.payment.PaymentService.charge(PaymentService.java:112)
\tat io.signoz.sample.payment.PaymentController.pay(PaymentController.java:48)
\tat java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1136)`,
};

interface EventShape {
	group: ExceptionShape;
	errorId: string;
	spanID: string;
	traceID: string;
}

const groupOf = (exceptionType: string): ExceptionShape => {
	const found = EXCEPTION_CATALOGUE.find(
		(exception) => exception.exceptionType === exceptionType,
	);

	if (!found) {
		throw new Error(`no exception group for ${exceptionType} in the catalogue`);
	}

	return found;
};

const EVENTS: Record<ExceptionLanguage, EventShape> = {
	go: {
		group: groupOf('*errors.errorString'),
		errorId: '7c1ba0d4e6f84a1f9d2b3c4e5f607182',
		spanID: '3a5c7e9b1d0f2468',
		traceID: 'd41f8c2a6b3e5079a1c4e6b8d0f2a468',
	},
	python: {
		group: groupOf('ConnectionError'),
		errorId: 'b2d4f60819a3c5e7092b4d6f8a0c1e35',
		spanID: '9f1d3b5a7c9e0246',
		traceID: '5e7a9c1b3d5f7911a3c5e7b9d1f30517',
	},
	java: {
		group: groupOf('java.net.SocketTimeoutException'),
		errorId: 'e6c8a0f2d4b60819273a5c7e9b1d3f50',
		spanID: '2c4e6a8b0d2f4618',
		traceID: 'a0c2e4b6d8f01325476a8c0e2b4d6f81',
	},
};

/** The parameters the list links with, and the ones Older and Newer add to them. */
export const errorDetailsSearch = (
	language: ExceptionLanguage,
	params: DetailParams,
): string => {
	const { group, errorId } = EVENTS[language];
	const search = new URLSearchParams({ groupId: group.groupID });

	if (params === 'no-timestamp') {
		return search.toString();
	}

	search.set('timestamp', STEP_TIMESTAMPS.event.nanos);

	if (params === 'event') {
		search.set('errorId', errorId);
	}

	return search.toString();
};

export interface EventLookup {
	timestamp: string | null;
	errorId?: string | null;
}

/**
 * `/errorFromGroupID` and `/errorFromErrorID` both answer with the event itself,
 * unwrapped: the api module hands the whole body through as the payload.
 */
export const errorEvent = (
	language: ExceptionLanguage,
	lookup: EventLookup,
): ErrorEvent => {
	const event = EVENTS[language];
	const step = stepAt(lookup.timestamp);

	return {
		errorId: lookup.errorId || eventIdAt(step, event.errorId),
		exceptionType: event.group.exceptionType,
		exceptionMessage: event.group.exceptionMessage,
		exceptionStacktrace: STACK_TRACES[language],
		exceptionEscaped: 'false',
		timestamp: STEP_TIMESTAMPS[step].at,
		spanID: event.spanID,
		traceID: event.traceID,
		serviceName: event.group.serviceName,
		groupID: event.group.groupID,
	};
};

const neighbourSteps = (
	step: Step,
	state: NeighbourState,
): { older: Step | null; newer: Step | null } => {
	if (step === 'older') {
		return { older: null, newer: 'event' };
	}

	if (step === 'newer') {
		return { older: 'event', newer: null };
	}

	return {
		older: state === 'surrounded' || state === 'newest' ? 'older' : null,
		newer: state === 'surrounded' || state === 'oldest' ? 'newer' : null,
	};
};

/**
 * An empty id is how the backend says there is nothing further in that
 * direction, and it is what the Older and Newer buttons read to disable
 * themselves. Which end of the walk the page is on comes from the timestamp it
 * asks with, so a step in either direction lands somewhere it can step back
 * from.
 */
export const errorNeighbours = (
	language: ExceptionLanguage,
	state: NeighbourState,
	timestamp: string | null,
): NextPrevIds => {
	const event = EVENTS[language];
	const { older, newer } = neighbourSteps(stepAt(timestamp), state);

	return {
		groupID: event.group.groupID,
		prevErrorID: older ? eventIdAt(older, event.errorId) : '',
		prevTimestamp: older ? STEP_TIMESTAMPS[older].at : '',
		nextErrorID: newer ? eventIdAt(newer, event.errorId) : '',
		nextTimestamp: newer ? STEP_TIMESTAMPS[newer].at : '',
	};
};

/**
 * What the backend answers when no event matches the group and timestamp: a 404
 * carrying its own envelope, which `ErrorResponseHandler` reduces to the
 * `errorType` the page prints. A `null` body instead of this reaches the page as
 * a TypeError, so the `idPayload === null` branch it guards for is unreachable.
 */
export const ERROR_EVENT_NOT_FOUND = {
	status: 'error',
	errorType: 'not_found',
	error: 'Error/Exception not found',
	data: null,
};
