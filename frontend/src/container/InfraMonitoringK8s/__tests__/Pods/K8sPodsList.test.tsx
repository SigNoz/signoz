/**
 * Tests for URL parameter parsing in K8s Infra Monitoring components.
 *
 * These tests verify the fix for the double URL decoding bug where
 * components were calling decodeURIComponent() on values already
 * decoded by URLSearchParams.get(), causing crashes on K8s parameters
 * with special characters.
 */

import { getFiltersFromParams } from '../../commonUtils';

describe('K8sPodsList URL Parameter Parsing', () => {
	describe('getFiltersFromParams', () => {
		it('should return null when no filters in params', () => {
			const searchParams = new URLSearchParams();
			const result = getFiltersFromParams(searchParams, 'filters');
			expect(result).toBeNull();
		});

		it('should parse filters from URL params', () => {
			const filters = {
				items: [
					{
						id: '1',
						key: { key: 'k8s_namespace_name' },
						op: '=',
						value: 'default',
					},
				],
				op: 'AND',
			};
			const searchParams = new URLSearchParams();
			searchParams.set('filters', JSON.stringify(filters));

			const result = getFiltersFromParams(searchParams, 'filters');
			expect(result).toEqual(filters);
		});

		it('should handle URL-encoded filters (auto-decoded by URLSearchParams)', () => {
			const filters = {
				items: [
					{
						id: '1',
						key: { key: 'k8s_pod_name' },
						op: 'contains',
						value: 'api-server',
					},
				],
				op: 'AND',
			};
			const encodedValue = encodeURIComponent(JSON.stringify(filters));
			const searchParams = new URLSearchParams(`filters=${encodedValue}`);

			const result = getFiltersFromParams(searchParams, 'filters');
			expect(result).toEqual(filters);
		});

		it('should return null on malformed JSON instead of crashing', () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
			const searchParams = new URLSearchParams();
			searchParams.set('filters', '{invalid-json}');

			const result = getFiltersFromParams(searchParams, 'filters');
			expect(result).toBeNull();
			consoleSpy.mockRestore();
		});

		it('should handle filters with K8s container image names', () => {
			const filters = {
				items: [
					{
						id: '1',
						key: { key: 'k8s_container_name' },
						op: '=',
						value: 'registry.k8s.io/coredns/coredns:v1.10.1',
					},
				],
				op: 'AND',
			};
			const encodedValue = encodeURIComponent(JSON.stringify(filters));
			const searchParams = new URLSearchParams(`filters=${encodedValue}`);

			const result = getFiltersFromParams(searchParams, 'filters');
			expect(result).toEqual(filters);
		});
	});

	describe('regression: double decoding issue', () => {
		it('should not crash when URL params are already decoded by URLSearchParams', () => {
			// The key bug: URLSearchParams.get() auto-decodes, so encoding once in URL
			// means .get() returns decoded value. Old code called decodeURIComponent()
			// again which could crash on certain characters.

			const filters = {
				items: [
					{
						id: '1',
						key: { key: 'k8s_namespace_name' },
						op: '=',
						value: 'kube-system',
					},
				],
				op: 'AND',
			};

			const encodedValue = encodeURIComponent(JSON.stringify(filters));
			const searchParams = new URLSearchParams(`filters=${encodedValue}`);

			// This should work without crashing
			const result = getFiltersFromParams(searchParams, 'filters');
			expect(result).toEqual(filters);
		});

		it('should handle values with percent signs in labels', () => {
			// K8s labels might contain literal "%" characters like "cpu-usage-50%"
			const filters = {
				items: [
					{
						id: '1',
						key: { key: 'k8s_label' },
						op: '=',
						value: 'cpu-50%',
					},
				],
				op: 'AND',
			};

			const encodedValue = encodeURIComponent(JSON.stringify(filters));
			const searchParams = new URLSearchParams(`filters=${encodedValue}`);

			const result = getFiltersFromParams(searchParams, 'filters');
			expect(result).toEqual(filters);
		});

		it('should handle complex K8s deployment names with special chars', () => {
			const filters = {
				items: [
					{
						id: '1',
						key: { key: 'k8s_deployment_name' },
						op: '=',
						value: 'nginx-ingress-controller',
					},
				],
				op: 'AND',
			};

			const encodedValue = encodeURIComponent(JSON.stringify(filters));
			const searchParams = new URLSearchParams(`filters=${encodedValue}`);

			const result = getFiltersFromParams(searchParams, 'filters');
			expect(result).toEqual(filters);
		});
	});
});
