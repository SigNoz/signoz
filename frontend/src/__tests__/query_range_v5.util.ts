import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest, RestRequest } from 'msw';
import { MetricRangePayloadV5 } from 'types/api/v5/queryRange';

const QUERY_RANGE_URL = `${ENVIRONMENT.baseURL}/api/v5/query_range`;

export type MockLogsOptions = {
	offset?: number;
	pageSize?: number;
	hasMore?: boolean;
	delay?: number;
	onReceiveRequest?: (
		req: RestRequest,
	) =>
		| undefined
		| void
		| Omit<MockLogsOptions, 'onReceiveRequest'>
		| Promise<Omit<MockLogsOptions, 'onReceiveRequest'>>
		| Promise<void>;
};

const createLogsResponse = ({
	offset = 0,
	pageSize = 100,
	hasMore = true,
}: MockLogsOptions): MetricRangePayloadV5 => {
	const itemsForThisPage = hasMore ? pageSize : pageSize / 2;

	return {
		data: {
			type: 'raw',
			data: {
				results: [
					{
						queryName: 'A',
						rows: Array.from({ length: itemsForThisPage }, (_, index) => {
							const cumulativeIndex = offset + index;
							const baseTimestamp = new Date('2024-02-15T21:20:22Z').getTime();
							const currentTimestamp = new Date(
								baseTimestamp - cumulativeIndex * 1000,
							);
							const timestampString = currentTimestamp.toISOString();
							const id = `log-id-${cumulativeIndex}`;
							const logLevel = ['INFO', 'WARN', 'ERROR'][cumulativeIndex % 3];
							const service = ['frontend', 'backend', 'database'][cumulativeIndex % 3];

							return {
								timestamp: timestampString,
								data: {
									attributes_bool: {},
									attributes_float64: {},
									attributes_int64: {},
									attributes_string: {
										host_name: 'test-host',
										log_level: logLevel,
										service,
									},
									body: `${timestampString} ${logLevel} ${service} Log message ${cumulativeIndex}`,
									id,
									resources_string: {
										'host.name': 'test-host',
									},
									severity_number: [9, 13, 17][cumulativeIndex % 3],
									severity_text: logLevel,
									span_id: `span-${cumulativeIndex}`,
									trace_flags: 0,
									trace_id: `trace-${cumulativeIndex}`,
								},
							};
						}),
					},
				],
			},
			meta: {
				bytesScanned: 0,
				durationMs: 0,
				rowsScanned: 0,
				stepIntervals: {},
			},
		},
	};
};

export function mockQueryRangeV5WithLogsResponse({
	hasMore = true,
	offset = 0,
	pageSize = 100,
	delay = 0,
	onReceiveRequest,
}: MockLogsOptions = {}): void {
	server.use(
		rest.post(QUERY_RANGE_URL, async (req, res, ctx) =>
			res(
				...(delay ? [ctx.delay(delay)] : []),
				ctx.status(200),
				ctx.json(
					createLogsResponse(
						(await onReceiveRequest?.(req)) ?? {
							hasMore,
							pageSize,
							offset,
						},
					),
				),
			),
		),
	);
}

export function mockQueryRangeV5WithError(
	error: string,
	statusCode = 500,
): void {
	server.use(
		rest.post(QUERY_RANGE_URL, (_, res, ctx) =>
			res(
				ctx.status(statusCode),
				ctx.json({
					error,
				}),
			),
		),
	);
}

export type MockEventsOptions = {
	offset?: number;
	pageSize?: number;
	hasMore?: boolean;
	delay?: number;
	onReceiveRequest?: (
		req: RestRequest,
	) =>
		| undefined
		| void
		| Omit<MockEventsOptions, 'onReceiveRequest'>
		| Promise<Omit<MockEventsOptions, 'onReceiveRequest'>>
		| Promise<void>;
};

const createEventsResponse = ({
	offset = 0,
	pageSize = 10,
	hasMore = true,
}: MockEventsOptions): MetricRangePayloadV5 => {
	const itemsForThisPage = hasMore ? pageSize : Math.ceil(pageSize / 2);

	const eventReasons = [
		'BackoffLimitExceeded',
		'SuccessfulCreate',
		'Pulled',
		'Created',
		'Started',
		'Killing',
	];
	const severityTexts = ['Warning', 'Normal'];
	const severityNumbers = [13, 9];
	const objectKinds = ['Job', 'Pod', 'Deployment', 'ReplicaSet'];
	const eventBodies = [
		'Job has reached the specified backoff limit',
		'Created pod: demo-pod',
		'Successfully pulled image',
		'Created container',
		'Started container',
		'Stopping container',
	];

	return {
		data: {
			type: 'raw',
			data: {
				results: [
					{
						queryName: 'A',
						nextCursor: hasMore ? 'next-cursor-token' : '',
						rows: Array.from({ length: itemsForThisPage }, (_, index) => {
							const cumulativeIndex = offset + index;
							const baseTimestamp = new Date('2026-04-21T17:54:33Z').getTime();
							const currentTimestamp = new Date(
								baseTimestamp - cumulativeIndex * 60000,
							);
							const timestampString = currentTimestamp.toISOString();
							const id = `event-id-${cumulativeIndex}`;
							const severityIndex = cumulativeIndex % 2;
							const reasonIndex = cumulativeIndex % eventReasons.length;
							const kindIndex = cumulativeIndex % objectKinds.length;

							return {
								timestamp: timestampString,
								data: {
									attributes_bool: {},
									attributes_number: {
										'k8s.event.count': 1,
									},
									attributes_string: {
										'k8s.event.action': '',
										'k8s.event.name': `demo-event-${cumulativeIndex}.${Math.random()
											.toString(36)
											.substring(7)}`,
										'k8s.event.reason': eventReasons[reasonIndex],
										'k8s.event.start_time': `${currentTimestamp.toISOString()} +0000 UTC`,
										'k8s.event.uid': `uid-${cumulativeIndex}`,
										'k8s.namespace.name': 'demo-apps',
									},
									body: eventBodies[reasonIndex],
									id,
									resources_string: {
										'k8s.cluster.name': 'signoz-test',
										'k8s.node.name': '',
										'k8s.object.api_version': 'batch/v1',
										'k8s.object.fieldpath': '',
										'k8s.object.kind': objectKinds[kindIndex],
										'k8s.object.name': `demo-object-${cumulativeIndex}`,
										'k8s.object.resource_version': `${462900 + cumulativeIndex}`,
										'k8s.object.uid': `object-uid-${cumulativeIndex}`,
										'signoz.component': 'otel-deployment',
									},
									scope_name:
										'github.com/open-telemetry/opentelemetry-collector-contrib/receiver/k8seventsreceiver',
									scope_string: {},
									scope_version: '0.139.0',
									severity_number: severityNumbers[severityIndex],
									severity_text: severityTexts[severityIndex],
									span_id: '',
									timestamp: currentTimestamp.getTime() * 1000000,
									trace_flags: 0,
									trace_id: '',
								},
							};
						}),
					},
				],
			},
			meta: {
				bytesScanned: 9682976,
				durationMs: 295,
				rowsScanned: 34198,
				stepIntervals: {
					A: 170,
				},
			},
		},
	};
};

export function mockQueryRangeV5WithEventsResponse({
	hasMore = true,
	offset = 0,
	pageSize = 10,
	delay = 0,
	onReceiveRequest,
}: MockEventsOptions = {}): void {
	server.use(
		rest.post(QUERY_RANGE_URL, async (req, res, ctx) =>
			res(
				...(delay ? [ctx.delay(delay)] : []),
				ctx.status(200),
				ctx.json(
					createEventsResponse(
						(await onReceiveRequest?.(req)) ?? {
							hasMore,
							pageSize,
							offset,
						},
					),
				),
			),
		),
	);
}

export type MockTracesOptions = {
	offset?: number;
	pageSize?: number;
	hasMore?: boolean;
	delay?: number;
	customTraces?: Array<{
		serviceName?: string;
		name?: string;
		durationNano?: number;
		httpMethod?: string;
		responseStatusCode?: string;
	}>;
	onReceiveRequest?: (
		req: RestRequest,
	) =>
		| undefined
		| void
		| Omit<MockTracesOptions, 'onReceiveRequest'>
		| Promise<Omit<MockTracesOptions, 'onReceiveRequest'>>
		| Promise<void>;
};

const createTracesResponse = ({
	offset = 0,
	pageSize = 10,
	hasMore = true,
	customTraces,
}: MockTracesOptions): MetricRangePayloadV5 => {
	const serviceNames = ['frontend', 'backend', 'database', 'api-gateway'];
	const spanNames = [
		'GET /api/users',
		'POST /api/orders',
		'SELECT * FROM users',
	];
	const httpMethods = ['GET', 'POST', 'PUT', 'DELETE'];
	const statusCodes = ['200', '201', '400', '404', '500'];

	const rows = customTraces
		? customTraces.map((trace, index) => {
				const baseTimestamp = new Date('2026-04-21T17:54:33Z').getTime();
				const currentTimestamp = new Date(baseTimestamp - index * 60000);
				return {
					timestamp: currentTimestamp.toISOString(),
					data: {
						serviceName:
							trace.serviceName ?? serviceNames[index % serviceNames.length],
						name: trace.name ?? spanNames[index % spanNames.length],
						durationNano: trace.durationNano ?? 1000000 + index * 100000,
						httpMethod: trace.httpMethod ?? httpMethods[index % httpMethods.length],
						responseStatusCode:
							trace.responseStatusCode ?? statusCodes[index % statusCodes.length],
						traceID: `trace-id-${index}`,
						spanID: `span-id-${index}`,
					},
				};
			})
		: Array.from(
				{ length: hasMore ? pageSize : Math.ceil(pageSize / 2) },
				(_, index) => {
					const cumulativeIndex = offset + index;
					const baseTimestamp = new Date('2026-04-21T17:54:33Z').getTime();
					const currentTimestamp = new Date(baseTimestamp - cumulativeIndex * 60000);
					return {
						timestamp: currentTimestamp.toISOString(),
						data: {
							serviceName: serviceNames[cumulativeIndex % serviceNames.length],
							name: spanNames[cumulativeIndex % spanNames.length],
							durationNano: 1000000 + cumulativeIndex * 100000,
							httpMethod: httpMethods[cumulativeIndex % httpMethods.length],
							responseStatusCode: statusCodes[cumulativeIndex % statusCodes.length],
							traceID: `trace-id-${cumulativeIndex}`,
							spanID: `span-id-${cumulativeIndex}`,
						},
					};
				},
			);

	return {
		data: {
			type: 'raw',
			data: {
				results: [
					{
						queryName: 'A',
						nextCursor: hasMore ? 'next-cursor-token' : '',
						rows,
					},
				],
			},
			meta: {
				bytesScanned: 9682976,
				durationMs: 295,
				rowsScanned: 34198,
				stepIntervals: { A: 170 },
			},
		},
	};
};

export function mockQueryRangeV5WithTracesResponse({
	hasMore = true,
	offset = 0,
	pageSize = 10,
	delay = 0,
	customTraces,
	onReceiveRequest,
}: MockTracesOptions = {}): void {
	server.use(
		rest.post(QUERY_RANGE_URL, async (req, res, ctx) =>
			res(
				...(delay ? [ctx.delay(delay)] : []),
				ctx.status(200),
				ctx.json(
					createTracesResponse(
						(await onReceiveRequest?.(req)) ?? {
							hasMore,
							pageSize,
							offset,
							customTraces,
						},
					),
				),
			),
		),
	);
}

export function mockQueryRangeV5WithEmptyTraces(): void {
	server.use(
		rest.post(QUERY_RANGE_URL, (_, res, ctx) =>
			res(
				ctx.status(200),
				ctx.json({
					data: {
						type: 'raw',
						data: {
							results: [{ queryName: 'A', nextCursor: '', rows: [] }],
						},
						meta: {
							bytesScanned: 0,
							durationMs: 10,
							rowsScanned: 0,
							stepIntervals: {},
						},
					},
				}),
			),
		),
	);
}

export function mockQueryRangeV5WithKeyNotFoundError(): void {
	server.use(
		rest.post(QUERY_RANGE_URL, (_, res, ctx) =>
			res(
				ctx.status(400),
				ctx.json({
					error: {
						code: 'invalid_input',
						errors: [{ message: 'key not found' }],
					},
				}),
			),
		),
	);
}
