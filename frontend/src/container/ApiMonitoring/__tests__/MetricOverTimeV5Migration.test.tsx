import {
	getLatencyOverTimeWidgetData,
	getRateOverTimeWidgetData,
} from 'container/ApiMonitoring/utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

describe('MetricOverTime - V5 Migration Validation', () => {
	const mockDomainName = 'api.example.com';
	// eslint-disable-next-line sonarjs/no-duplicate-string
	const mockEndpointName = '/api/users';
	const emptyFilters: IBuilderQuery['filters'] = {
		items: [],
		op: 'AND',
	};

	describe('1. Rate Over Time - V5 Payload Structure', () => {
		it('generates V5 filter expression format (not V3 filters.items)', () => {
			const widget = getRateOverTimeWidgetData(
				mockDomainName,
				mockEndpointName,
				emptyFilters,
			);

			const queryData = widget.query.builder.queryData[0];

			// CRITICAL: Must use V5 format (filter.expression), not V3 format (filters.items)
			expect(queryData.filter).toBeDefined();
			expect(queryData?.filter?.expression).toBeDefined();
			expect(typeof queryData?.filter?.expression).toBe('string');

			// OLD V3 format should NOT exist
			expect(queryData).not.toHaveProperty('filters.items');
		});

		it('uses new domain filter format: (net.peer.name OR server.address)', () => {
			const widget = getRateOverTimeWidgetData(
				mockDomainName,
				mockEndpointName,
				emptyFilters,
			);

			const queryData = widget.query.builder.queryData[0];

			// Verify EXACT new filter format with OR operator
			expect(queryData?.filter?.expression).toContain(
				`(net.peer.name = '${mockDomainName}' OR server.address = '${mockDomainName}')`,
			);

			// Endpoint name is used in legend, not filter
			expect(queryData.legend).toContain('/api/users');
		});

		it('merges custom filters into filter expression', () => {
			const customFilters: IBuilderQuery['filters'] = {
				items: [
					{
						id: 'test-1',
						key: {
							// eslint-disable-next-line sonarjs/no-duplicate-string
							key: 'service.name',
							dataType: DataTypes.String,
							type: 'resource',
						},
						op: '=',
						// eslint-disable-next-line sonarjs/no-duplicate-string
						value: 'user-service',
					},
					{
						id: 'test-2',
						key: {
							key: 'deployment.environment',
							dataType: DataTypes.String,
							type: 'resource',
						},
						op: '=',
						value: 'production',
					},
				],
				op: 'AND',
			};

			const widget = getRateOverTimeWidgetData(
				mockDomainName,
				mockEndpointName,
				customFilters,
			);

			const queryData = widget.query.builder.queryData[0];

			// Verify domain filter is present
			expect(queryData?.filter?.expression).toContain(
				`(net.peer.name = '${mockDomainName}' OR server.address = '${mockDomainName}')`,
			);

			// Verify custom filters are merged into the expression
			expect(queryData?.filter?.expression).toContain('service.name');
			expect(queryData?.filter?.expression).toContain('user-service');
			expect(queryData?.filter?.expression).toContain('deployment.environment');
			expect(queryData?.filter?.expression).toContain('production');
		});
	});

	describe('2. Latency Over Time - V5 Payload Structure', () => {
		it('generates V5 filter expression format (not V3 filters.items)', () => {
			const widget = getLatencyOverTimeWidgetData(
				mockDomainName,
				mockEndpointName,
				emptyFilters,
			);

			const queryData = widget.query.builder.queryData[0];

			// CRITICAL: Must use V5 format (filter.expression), not V3 format (filters.items)
			expect(queryData.filter).toBeDefined();
			expect(queryData?.filter?.expression).toBeDefined();
			expect(typeof queryData?.filter?.expression).toBe('string');

			// OLD V3 format should NOT exist
			expect(queryData).not.toHaveProperty('filters.items');
		});

		it('uses new domain filter format: (net.peer.name OR server.address)', () => {
			const widget = getLatencyOverTimeWidgetData(
				mockDomainName,
				mockEndpointName,
				emptyFilters,
			);

			const queryData = widget.query.builder.queryData[0];

			// Verify EXACT new filter format with OR operator
			expect(queryData.filter).toBeDefined();
			expect(queryData?.filter?.expression).toContain(
				`(net.peer.name = '${mockDomainName}' OR server.address = '${mockDomainName}')`,
			);

			// Endpoint name is used in legend, not filter
			expect(queryData.legend).toContain('/api/users');
		});

		it('merges custom filters into filter expression', () => {
			const customFilters: IBuilderQuery['filters'] = {
				items: [
					{
						id: 'test-1',
						key: {
							key: 'service.name',
							dataType: DataTypes.String,
							type: 'resource',
						},
						op: '=',
						value: 'user-service',
					},
				],
				op: 'AND',
			};

			const widget = getLatencyOverTimeWidgetData(
				mockDomainName,
				mockEndpointName,
				customFilters,
			);

			const queryData = widget.query.builder.queryData[0];

			// Verify domain filter is present
			expect(queryData?.filter?.expression).toContain(
				`(net.peer.name = '${mockDomainName}' OR server.address = '${mockDomainName}') service.name = 'user-service'`,
			);
		});
	});
});
