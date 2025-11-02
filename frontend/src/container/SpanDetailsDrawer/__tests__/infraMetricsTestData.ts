import { Span } from 'types/api/trace/getTraceV2';

// Constants
const TEST_TRACE_ID = 'test-trace-id';
const TEST_CLUSTER_NAME = 'test-cluster';
const TEST_POD_NAME = 'test-pod-abc123';
const TEST_NODE_NAME = 'test-node-456';
const TEST_HOST_NAME = 'test-host.example.com';

// Mock span with infrastructure metadata (pod + node + host)
export const mockSpanWithInfraMetadata: Span = {
	spanId: 'infra-span-id',
	traceId: TEST_TRACE_ID,
	// eslint-disable-next-line sonarjs/no-duplicate-string
	name: 'api-service',
	serviceName: 'api-service',
	timestamp: 1640995200000000, // 2022-01-01 00:00:00 in microseconds
	durationNano: 2000000000, // 2 seconds in nanoseconds
	spanKind: 'server',
	statusCodeString: 'STATUS_CODE_OK',
	statusMessage: '',
	parentSpanId: '',
	references: [],
	event: [],
	tagMap: {
		'k8s.cluster.name': TEST_CLUSTER_NAME,
		'k8s.pod.name': TEST_POD_NAME,
		'k8s.node.name': TEST_NODE_NAME,
		'host.name': TEST_HOST_NAME,
		'service.name': 'api-service',
		'http.method': 'GET',
	},
	hasError: false,
	rootSpanId: '',
	kind: 0,
	rootName: '',
	hasChildren: false,
	hasSibling: false,
	subTreeNodeCount: 0,
	level: 0,
};

// Mock span with only pod metadata
export const mockSpanWithPodOnly: Span = {
	...mockSpanWithInfraMetadata,
	spanId: 'pod-only-span-id',
	tagMap: {
		'k8s.cluster.name': TEST_CLUSTER_NAME,
		'k8s.pod.name': TEST_POD_NAME,
		'service.name': 'api-service',
	},
};

// Mock span with only node metadata
export const mockSpanWithNodeOnly: Span = {
	...mockSpanWithInfraMetadata,
	spanId: 'node-only-span-id',
	tagMap: {
		'k8s.node.name': TEST_NODE_NAME,
		'service.name': 'api-service',
	},
};

// Mock span with only host metadata
export const mockSpanWithHostOnly: Span = {
	...mockSpanWithInfraMetadata,
	spanId: 'host-only-span-id',
	tagMap: {
		'host.name': TEST_HOST_NAME,
		'service.name': 'api-service',
	},
};

// Mock span without any infrastructure metadata
export const mockSpanWithoutInfraMetadata: Span = {
	...mockSpanWithInfraMetadata,
	spanId: 'no-infra-span-id',
	tagMap: {
		'service.name': 'api-service',
		'http.method': 'GET',
		'http.status_code': '200',
	},
};

// Mock infrastructure metrics API responses
export const mockPodMetricsResponse = {
	payload: {
		data: {
			newResult: {
				data: {
					result: [
						{
							metric: { pod_name: TEST_POD_NAME },
							values: [
								[1640995200, '0.5'], // CPU usage
								[1640995260, '0.6'],
							],
						},
					],
				},
			},
		},
	},
};

export const mockNodeMetricsResponse = {
	payload: {
		data: {
			newResult: {
				data: {
					result: [
						{
							metric: { node_name: TEST_NODE_NAME },
							values: [
								[1640995200, '2.1'], // Memory usage
								[1640995260, '2.3'],
							],
						},
					],
				},
			},
		},
	},
};

export const mockEmptyMetricsResponse = {
	payload: {
		data: {
			newResult: {
				data: {
					result: [],
				},
			},
		},
	},
};

// Expected infrastructure metadata extractions
export const expectedInfraMetadata = {
	clusterName: TEST_CLUSTER_NAME,
	podName: TEST_POD_NAME,
	nodeName: TEST_NODE_NAME,
	hostName: TEST_HOST_NAME,
};

export const expectedPodOnlyMetadata = {
	clusterName: TEST_CLUSTER_NAME,
	podName: TEST_POD_NAME,
	nodeName: '',
	hostName: '',
	// eslint-disable-next-line sonarjs/no-duplicate-string
	spanTimestamp: '2022-01-01T00:00:00.000Z',
};

export const expectedNodeOnlyMetadata = {
	clusterName: '',
	podName: '',
	nodeName: TEST_NODE_NAME,
	hostName: '',
	spanTimestamp: '2022-01-01T00:00:00.000Z',
};

export const expectedHostOnlyMetadata = {
	clusterName: '',
	podName: '',
	nodeName: '',
	hostName: TEST_HOST_NAME,
	spanTimestamp: '2022-01-01T00:00:00.000Z',
};
