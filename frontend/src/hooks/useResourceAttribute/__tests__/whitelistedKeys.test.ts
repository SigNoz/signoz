import ROUTES from 'constants/routes';

import { whilelistedKeys } from '../config';
import { mappingWithRoutesAndKeys } from '../utils';

describe('useResourceAttribute config', () => {
	describe('whilelistedKeys', () => {
		it('should include underscore-notation keys (DOT_METRICS_ENABLED=false)', () => {
			expect(whilelistedKeys).toContain('resource_deployment_environment');
			expect(whilelistedKeys).toContain('resource_k8s_cluster_name');
			expect(whilelistedKeys).toContain('resource_k8s_cluster_namespace');
		});

		it('should include dot-notation keys (DOT_METRICS_ENABLED=true)', () => {
			expect(whilelistedKeys).toContain('resource_deployment.environment');
			expect(whilelistedKeys).toContain('resource_k8s.cluster.name');
			expect(whilelistedKeys).toContain('resource_k8s.cluster.namespace');
		});
	});

	describe('mappingWithRoutesAndKeys', () => {
		const dotNotationFilters = [
			{
				label: 'deployment.environment',
				value: 'resource_deployment.environment',
			},
			{ label: 'k8s.cluster.name', value: 'resource_k8s.cluster.name' },
			{ label: 'k8s.cluster.namespace', value: 'resource_k8s.cluster.namespace' },
		];

		const underscoreNotationFilters = [
			{
				label: 'deployment.environment',
				value: 'resource_deployment_environment',
			},
			{ label: 'k8s.cluster.name', value: 'resource_k8s_cluster_name' },
			{ label: 'k8s.cluster.namespace', value: 'resource_k8s_cluster_namespace' },
		];

		const nonWhitelistedFilters = [
			{ label: 'host.name', value: 'resource_host_name' },
			{ label: 'service.name', value: 'resource_service_name' },
		];

		it('should keep dot-notation filters on the Service Map route', () => {
			const result = mappingWithRoutesAndKeys(
				ROUTES.SERVICE_MAP,
				dotNotationFilters,
			);
			expect(result).toHaveLength(3);
			expect(result).toEqual(dotNotationFilters);
		});

		it('should keep underscore-notation filters on the Service Map route', () => {
			const result = mappingWithRoutesAndKeys(
				ROUTES.SERVICE_MAP,
				underscoreNotationFilters,
			);
			expect(result).toHaveLength(3);
			expect(result).toEqual(underscoreNotationFilters);
		});

		it('should filter out non-whitelisted keys on the Service Map route', () => {
			const allFilters = [...dotNotationFilters, ...nonWhitelistedFilters];
			const result = mappingWithRoutesAndKeys(ROUTES.SERVICE_MAP, allFilters);
			expect(result).toHaveLength(3);
			expect(result).toEqual(dotNotationFilters);
		});

		it('should return all filters on non-Service Map routes', () => {
			const allFilters = [...dotNotationFilters, ...nonWhitelistedFilters];
			const result = mappingWithRoutesAndKeys('/services', allFilters);
			expect(result).toHaveLength(5);
			expect(result).toEqual(allFilters);
		});
	});
});
