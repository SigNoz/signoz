import { InframonitoringtypesContainerRecordDTO } from 'api/generated/services/sigNoz.schemas';
import {
	k8sContainerGetSelectedItemExpression,
	k8sContainerInitialEventsExpression,
	k8sContainerInitialLogTracesExpression,
} from 'container/InfraMonitoringK8sV2/Containers/constants';
import { getContainerMetricsQueryPayload } from 'container/InfraMonitoringK8sV2/Containers/metrics';
import {
	getK8sContainerItemKey,
	getK8sContainerRowKey,
} from 'container/InfraMonitoringK8sV2/Containers/table.config';
import { getContainerImageWithTag } from 'container/InfraMonitoringK8sV2/Containers/utils';

function makeContainer(
	overrides: Partial<InframonitoringtypesContainerRecordDTO> = {},
): InframonitoringtypesContainerRecordDTO {
	return {
		containerName: 'nginx',
		podUID: 'pod-uid-1',
		meta: {
			'k8s.container.name': 'nginx',
			'k8s.pod.uid': 'pod-uid-1',
			'k8s.pod.name': 'web-0',
			'k8s.namespace.name': 'production',
			'k8s.cluster.name': 'prod-cluster',
			'container.image.name': 'nginx',
			'container.image.tag': '1.27',
		},
		...overrides,
	} as InframonitoringtypesContainerRecordDTO;
}

describe('container identity', () => {
	it('keys a row by the (pod UID, container name) pair', () => {
		expect(getK8sContainerRowKey(makeContainer())).toBe('pod-uid-1/nginx');
	});

	it('carries the container name alongside the pod UID into the drawer params', () => {
		expect(getK8sContainerItemKey(makeContainer())).toStrictEqual({
			selectedItem: 'pod-uid-1',
			containerName: 'nginx',
			clusterName: null,
			namespaceName: null,
		});
	});

	it('falls back to meta when the record fields are empty', () => {
		const container = makeContainer({ containerName: '', podUID: '' });

		expect(getK8sContainerItemKey(container)).toStrictEqual({
			selectedItem: 'pod-uid-1',
			containerName: 'nginx',
			clusterName: null,
			namespaceName: null,
		});
	});

	it('scopes the details fetch to both halves of the identity', () => {
		expect(
			k8sContainerGetSelectedItemExpression({
				selectedItem: 'pod-uid-1',
				containerName: 'nginx',
			}),
		).toBe("k8s.pod.uid = 'pod-uid-1' AND k8s.container.name = 'nginx'");
	});
});

describe('getContainerImageWithTag', () => {
	it('renders name and tag together', () => {
		expect(getContainerImageWithTag(makeContainer())).toBe('nginx:1.27');
	});

	it('drops the tag when the image is not pinned', () => {
		const container = makeContainer({
			meta: { 'container.image.name': 'nginx' },
		});

		expect(getContainerImageWithTag(container)).toBe('nginx');
	});

	it('renders nothing when the image name is missing', () => {
		expect(getContainerImageWithTag(makeContainer({ meta: {} }))).toBe('');
	});
});

describe('container drawer expressions', () => {
	it('scopes logs and traces to the container within its pod', () => {
		expect(k8sContainerInitialLogTracesExpression(makeContainer())).toBe(
			"k8s.pod.uid = 'pod-uid-1' AND k8s.cluster.name = 'prod-cluster' AND k8s.namespace.name = 'production' AND k8s.container.name = 'nginx'",
		);
	});

	it('scopes events to the pod, since k8s emits events per pod', () => {
		expect(k8sContainerInitialEventsExpression(makeContainer())).toBe(
			"k8s.object.kind = 'Pod' AND k8s.object.name = 'web-0' AND k8s.cluster.name = 'prod-cluster' AND attribute.k8s.namespace.name = 'production'",
		);
	});
});

describe('getContainerMetricsQueryPayload', () => {
	const payloads = getContainerMetricsQueryPayload(makeContainer(), 1000, 2000);

	it('returns one payload per documented chart', () => {
		expect(payloads).toHaveLength(10);
	});

	it('scopes every query to the selected container', () => {
		payloads.forEach((payload) => {
			payload.query.builder.queryData.forEach((query) => {
				expect(query.filters?.items).toStrictEqual([
					expect.objectContaining({
						key: expect.objectContaining({ key: 'k8s.pod.uid' }),
						op: '=',
						value: 'pod-uid-1',
					}),
					expect.objectContaining({
						key: expect.objectContaining({ key: 'k8s.container.name' }),
						op: '=',
						value: 'nginx',
					}),
				]);
			});
		});
	});

	it('derives cache memory from the working set and RSS queries', () => {
		const memoryByState = payloads[4];

		expect(
			memoryByState.query.builder.queryData.map((query) => [
				query.queryName,
				query.aggregateAttribute?.key,
			]),
		).toStrictEqual([
			['A', 'container.memory.rss'],
			['B', 'container.memory.working_set'],
		]);
		expect(memoryByState.query.builder.queryFormulas).toStrictEqual([
			expect.objectContaining({ expression: 'B - A', legend: 'Cache Memory' }),
		]);
	});
});
