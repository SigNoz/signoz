import {
	buildEventsExpression,
	buildExpressionFromSelectedItemParams,
	buildLogsTracesExpression,
} from 'container/InfraMonitoringK8sV2/Base/utils';

describe('buildExpressionFromSelectedItemParams', () => {
	it('should build expression from params with all values', () => {
		const result = buildExpressionFromSelectedItemParams(
			{
				selectedItem: 'nginx',
				clusterName: 'prod',
				namespaceName: 'default',
			},
			'k8s.deployment.name',
		);

		expect(result).toBe(
			"k8s.deployment.name = 'nginx' AND k8s.cluster.name = 'prod' AND k8s.namespace.name = 'default'",
		);
	});

	it('should skip null values', () => {
		const result = buildExpressionFromSelectedItemParams(
			{
				selectedItem: 'nginx',
				clusterName: null,
				namespaceName: 'default',
			},
			'k8s.deployment.name',
		);

		expect(result).toBe(
			"k8s.deployment.name = 'nginx' AND k8s.namespace.name = 'default'",
		);
	});

	it('should handle only selectedItem', () => {
		const result = buildExpressionFromSelectedItemParams(
			{
				selectedItem: 'pod-123',
				clusterName: null,
				namespaceName: null,
			},
			'k8s.pod.uid',
		);

		expect(result).toBe("k8s.pod.uid = 'pod-123'");
	});
});

describe('buildEventsExpression', () => {
	it('should build expression with kind, name, cluster and attribute-context namespace', () => {
		const result = buildEventsExpression({
			objectKind: 'Deployment',
			objectName: 'nginx',
			clusterName: 'prod',
			namespaceName: 'default',
		});

		expect(result).toBe(
			"k8s.object.kind = 'Deployment' AND k8s.object.name = 'nginx' AND k8s.cluster.name = 'prod' AND attribute.k8s.namespace.name = 'default'",
		);
	});

	it('should always include kind and name, even when name is empty', () => {
		const result = buildEventsExpression({
			objectKind: 'Node',
			objectName: '',
		});

		expect(result).toBe("k8s.object.kind = 'Node' AND k8s.object.name = ''");
	});

	it('should skip cluster and namespace clauses when values are missing', () => {
		const result = buildEventsExpression({
			objectKind: 'Pod',
			objectName: 'pod-1',
			clusterName: null,
			namespaceName: undefined,
		});

		expect(result).toBe("k8s.object.kind = 'Pod' AND k8s.object.name = 'pod-1'");
	});

	it('should escape values with quotes', () => {
		const result = buildEventsExpression({
			objectKind: 'Pod',
			objectName: "po'd",
			namespaceName: 'ns-1',
		});

		expect(result).toBe(
			`k8s.object.kind = 'Pod' AND k8s.object.name = 'po\\'d' AND attribute.k8s.namespace.name = 'ns-1'`,
		);
	});
});

describe('buildLogsTracesExpression', () => {
	it('should build expression with main attribute, cluster and namespace', () => {
		const result = buildLogsTracesExpression({
			mainAttributeKey: 'k8s.deployment.name',
			mainAttributeValue: 'nginx',
			clusterName: 'prod',
			namespaceName: 'default',
		});

		expect(result).toBe(
			"k8s.deployment.name = 'nginx' AND k8s.cluster.name = 'prod' AND k8s.namespace.name = 'default'",
		);
	});

	it('should skip clauses with empty values', () => {
		const result = buildLogsTracesExpression({
			mainAttributeKey: 'k8s.node.name',
			mainAttributeValue: 'node-1',
			clusterName: '',
			namespaceName: null,
		});

		expect(result).toBe("k8s.node.name = 'node-1'");
	});

	it('should return empty string when all values are missing', () => {
		const result = buildLogsTracesExpression({
			mainAttributeKey: 'k8s.pod.name',
			mainAttributeValue: '',
		});

		expect(result).toBe('');
	});
});
