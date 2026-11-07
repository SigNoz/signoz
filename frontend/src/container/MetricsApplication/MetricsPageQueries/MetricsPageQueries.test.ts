import { MetricsType, WidgetKeys } from 'container/MetricsApplication/constant';
import { serviceMetricsQuery } from 'container/ServiceApplication/ServiceMetrics/ServiceMetricsQuery';

import { databaseCallsAvgDuration, databaseCallsRPS } from './DBCallQueries';
import {
	externalCallDuration,
	externalCallDurationByAddress,
	externalCallErrorPercent,
	externalCallRpsByAddress,
} from './ExternalQueries';
import {
	apDexMetricsQueryBuilderQueries,
	errorPercentage,
	latency,
	operationPerSec,
} from './OverviewQueries';
import { topOperationQueries } from './TopOperationQueries';

describe('Services Span Metrics Queries - Field Context (Issue #13169)', () => {
	const serviceName = 'cart-service';

	describe('OverviewQueries', () => {
		it('latency with span metrics enabled filters service.name as Tag, not Resource', () => {
			const result = latency({
				servicename: serviceName,
				tagFilterItems: [],
				isSpanMetricEnable: true,
				topLevelOperationsRoute: ['/checkout'],
			});

			const queryA = result.queryData[0];
			const serviceFilter = queryA?.filters?.items.find(
				(item) => item.key?.key === WidgetKeys.OTelServiceName,
			);
			expect(serviceFilter).toBeDefined();
			expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
			expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
			expect(serviceFilter?.value).toStrictEqual([serviceName]);
		});

		it('latency with span metrics disabled queries traces with ServiceName as Tag', () => {
			const result = latency({
				servicename: serviceName,
				tagFilterItems: [],
				isSpanMetricEnable: false,
				topLevelOperationsRoute: ['/checkout'],
			});

			const queryA = result.queryData[0];
			const serviceFilter = queryA?.filters?.items.find(
				(item) => item.key?.key === WidgetKeys.ServiceName,
			);
			expect(serviceFilter).toBeDefined();
			expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
		});

		it('operationPerSec (Rate ops/s) filters service.name as Tag, not Resource', () => {
			const result = operationPerSec({
				servicename: serviceName,
				tagFilterItems: [],
				topLevelOperations: ['/checkout'],
			});

			const query = result.queryData[0];
			const serviceFilter = query?.filters?.items.find(
				(item) => item.key?.key === WidgetKeys.OTelServiceName,
			);
			expect(serviceFilter).toBeDefined();
			expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
			expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
			expect(serviceFilter?.value).toStrictEqual([serviceName]);
		});

		it('errorPercentage filters service.name as Tag in both numerator and denominator queries', () => {
			const result = errorPercentage({
				servicename: serviceName,
				tagFilterItems: [],
				topLevelOperations: ['/checkout'],
			});

			expect(result.queryData.length).toBeGreaterThanOrEqual(2);
			result.queryData.forEach((query) => {
				const serviceFilter = query.filters?.items.find(
					(item) => item.key?.key === WidgetKeys.OTelServiceName,
				);
				expect(serviceFilter).toBeDefined();
				expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
				expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
				expect(serviceFilter?.value).toStrictEqual([serviceName]);
			});
		});

		it('apDexMetricsQueryBuilderQueries retains Tag context for service.name', () => {
			const result = apDexMetricsQueryBuilderQueries({
				servicename: serviceName,
				tagFilterItems: [],
				topLevelOperationsRoute: ['/checkout'],
				threashold: 0.5,
				metricsBuckets: [100, 250, 500, 1000],
				delta: true,
			});

			result.queryData.forEach((query) => {
				const serviceFilter = query.filters?.items.find(
					(item) => item.key?.key === WidgetKeys.OTelServiceName,
				);
				expect(serviceFilter).toBeDefined();
				expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
				expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
			});
		});
	});

	describe('DBCallQueries', () => {
		it('databaseCallsRPS filters service.name as Tag, not Resource', () => {
			const result = databaseCallsRPS({
				servicename: serviceName,
				legend: '{{db.system}}',
				tagFilterItems: [],
			});

			const query = result.queryData[0];
			const serviceFilter = query?.filters?.items.find(
				(item) => item.key?.key === WidgetKeys.OTelServiceName,
			);
			expect(serviceFilter).toBeDefined();
			expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
			expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
		});

		it('databaseCallsAvgDuration filters service.name as Tag in all formula subqueries', () => {
			const result = databaseCallsAvgDuration({
				servicename: serviceName,
				tagFilterItems: [],
			});

			result.queryData.forEach((query) => {
				const serviceFilter = query.filters?.items.find(
					(item) => item.key?.key === WidgetKeys.OTelServiceName,
				);
				expect(serviceFilter).toBeDefined();
				expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
				expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
			});
		});
	});

	describe('ExternalQueries', () => {
		it('externalCallErrorPercent filters service.name as Tag in all subqueries', () => {
			const result = externalCallErrorPercent({
				servicename: serviceName,
				legend: '{{address}}',
				tagFilterItems: [],
			});

			result.queryData.forEach((query) => {
				const serviceFilter = query.filters?.items.find(
					(item) => item.key?.key === WidgetKeys.OTelServiceName,
				);
				expect(serviceFilter).toBeDefined();
				expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
				expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
			});
		});

		it('externalCallDuration filters service.name as Tag in all subqueries', () => {
			const result = externalCallDuration({
				servicename: serviceName,
				tagFilterItems: [],
			});

			result.queryData.forEach((query) => {
				const serviceFilter = query.filters?.items.find(
					(item) => item.key?.key === WidgetKeys.OTelServiceName,
				);
				expect(serviceFilter).toBeDefined();
				expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
				expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
			});
		});

		it('externalCallRpsByAddress filters service.name as Tag', () => {
			const result = externalCallRpsByAddress({
				servicename: serviceName,
				legend: '{{address}}',
				tagFilterItems: [],
			});

			const query = result.queryData[0];
			const serviceFilter = query?.filters?.items.find(
				(item) => item.key?.key === WidgetKeys.OTelServiceName,
			);
			expect(serviceFilter).toBeDefined();
			expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
			expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
		});

		it('externalCallDurationByAddress filters service.name as Tag in all subqueries', () => {
			const result = externalCallDurationByAddress({
				servicename: serviceName,
				legend: '{{address}}',
				tagFilterItems: [],
			});

			result.queryData.forEach((query) => {
				const serviceFilter = query.filters?.items.find(
					(item) => item.key?.key === WidgetKeys.OTelServiceName,
				);
				expect(serviceFilter).toBeDefined();
				expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
				expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
			});
		});
	});

	describe('TopOperationQueries', () => {
		it('topOperationQueries filters service.name as Tag in all queries', () => {
			const result = topOperationQueries({
				servicename: serviceName,
			});

			result.queryData.forEach((query) => {
				const serviceFilter = query.filters?.items.find(
					(item) => item.key?.key === WidgetKeys.OTelServiceName,
				);
				expect(serviceFilter).toBeDefined();
				expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
				expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
			});
		});
	});

	describe('ServiceMetricsQuery', () => {
		it('serviceMetricsQuery filters service.name as Tag in alignment with groupBy Tag', () => {
			const result = serviceMetricsQuery(['cart-service', ['/checkout']]);

			// Verify all 4 queries (p99, error rate numerator, error rate denominator, ops/sec)
			result.queryData.forEach((query) => {
				const serviceFilter = query.filters?.items.find(
					(item) => item.key?.key === WidgetKeys.OTelServiceName,
				);
				expect(serviceFilter).toBeDefined();
				expect(serviceFilter?.key?.type).toBe(MetricsType.Tag);
				expect(serviceFilter?.key?.type).not.toBe(MetricsType.Resource);
			});

			// Verify groupBy also uses Tag
			const serviceGroupBy = result.queryData[0].groupBy.find(
				(gb) => gb.key === WidgetKeys.OTelServiceName,
			);
			expect(serviceGroupBy).toBeDefined();
			expect(serviceGroupBy?.type).toBe(MetricsType.Tag);
		});
	});
});
