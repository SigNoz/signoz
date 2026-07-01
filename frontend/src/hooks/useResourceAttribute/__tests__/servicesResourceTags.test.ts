import { Tags } from 'types/reducer/trace';

import {
	extractTracesResourceFieldKeyNames,
	filterSelectedTagsForTracesServices,
	isEnvironmentMetricResourceKey,
} from '../utils';

describe('services resource tag helpers', () => {
	describe('isEnvironmentMetricResourceKey', () => {
		it('recognizes default deployment environment metric keys', () => {
			expect(
				isEnvironmentMetricResourceKey('resource_deployment_environment'),
			).toBe(true);
			expect(
				isEnvironmentMetricResourceKey('resource_deployment.environment'),
			).toBe(true);
		});

		it('recognizes alternate environment keys from telemetry', () => {
			expect(isEnvironmentMetricResourceKey('resource_env')).toBe(true);
			expect(isEnvironmentMetricResourceKey('resource_environment')).toBe(true);
		});

		it('recognizes keys returned by getEnvironmentTagKeys', () => {
			expect(
				isEnvironmentMetricResourceKey('resource_custom_env', [
					'resource_custom_env',
				]),
			).toBe(true);
		});

		it('returns false for unrelated resource keys', () => {
			expect(isEnvironmentMetricResourceKey('resource_k8s_cluster_name')).toBe(
				false,
			);
		});
	});

	describe('extractTracesResourceFieldKeyNames', () => {
		it('returns trace resource field names from the fields API response', () => {
			const names = extractTracesResourceFieldKeyNames({
				keys: {
					'service.name': [],
					'k8s.namespace.name': [],
				},
				complete: true,
			});

			expect(names).toEqual(
				new Set(['service.name', 'k8s.namespace.name']),
			);
		});
	});

	describe('filterSelectedTagsForTracesServices', () => {
		const deploymentEnvironmentTag: Tags = {
			Key: 'deployment.environment',
			Operator: 'In',
			StringValues: ['prod'],
			NumberValues: [],
			BoolValues: [],
			TagType: 'ResourceAttribute',
		};

		const serviceNameTag: Tags = {
			Key: 'service.name',
			Operator: 'In',
			StringValues: ['frontend'],
			NumberValues: [],
			BoolValues: [],
			TagType: 'ResourceAttribute',
		};

		it('drops resource tags missing from traces metadata', () => {
			const filtered = filterSelectedTagsForTracesServices(
				[deploymentEnvironmentTag, serviceNameTag],
				new Set(['service.name']),
			);

			expect(filtered).toEqual([serviceNameTag]);
		});

		it('keeps resource tags present in traces metadata', () => {
			const filtered = filterSelectedTagsForTracesServices(
				[deploymentEnvironmentTag, serviceNameTag],
				new Set(['service.name', 'deployment.environment']),
			);

			expect(filtered).toEqual([deploymentEnvironmentTag, serviceNameTag]);
		});
	});
});
