import { Badge } from '@signozhq/ui/badge';

import styles from './utils.module.scss';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import {
	convertFiltersToExpression,
	formatValueForExpression,
} from 'components/QueryBuilderV2/utils';
import { SelectedItemParams } from 'container/InfraMonitoringK8sV2/hooks';
import {
	INFRA_MONITORING_ATTR_KEYS,
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	InfraMonitoringEntity,
} from 'container/InfraMonitoringK8sV2/constants';
import { QueryParams } from 'constants/query';
import { initialQueriesMap } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

export function sortByColumnOrder<T>(
	items: T[],
	getId: (item: T) => string,
	columnOrder: string[],
): T[] {
	if (columnOrder.length === 0) {
		return items;
	}
	const orderIndex = new Map(columnOrder.map((id, index) => [id, index]));
	return [...items].sort(
		(a, b) =>
			(orderIndex.get(getId(a)) ?? Number.MAX_SAFE_INTEGER) -
			(orderIndex.get(getId(b)) ?? Number.MAX_SAFE_INTEGER),
	);
}

export function getGroupedByMeta<
	T extends { meta?: Record<string, string> | null },
>(itemData: T, groupBy: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	const meta = itemData.meta ?? {};

	groupBy.forEach((key) => {
		result[key] = meta[key] ?? '';
	});

	return result;
}

export function getGroupByEl<
	T extends { meta?: Record<string, string> | null },
>(itemData: T, groupBy: string[]): React.ReactNode {
	const groupByValues: string[] = [];
	const meta = itemData.meta ?? {};

	groupBy.forEach((key) => {
		const value = meta[key] || '<no-value>';

		groupByValues.push(value);
	});

	return (
		<div className={styles.itemDataGroup}>
			{groupByValues.map((value, index) => (
				<Badge
					// oxlint-disable-next-line react/no-array-index-key
					key={`${index}-${value}`}
					color="secondary"
					className={styles.itemDataGroupTagItem}
				>
					{value === '' ? '<no-value>' : value}
				</Badge>
			))}
		</div>
	);
}

export function buildExpressionFromGroupMeta(
	parentExpression: string,
	groupMeta: Record<string, string> | undefined,
): string {
	const items: TagFilterItem[] = Object.entries(groupMeta ?? {})
		.filter(([, value]) => value !== '' && value !== undefined && value !== null)
		.map(([key, value]) => ({
			key: { key, type: 'resource' },
			op: '=',
			value,
			id: key,
		}));

	const metaExpression = convertFiltersToExpression({
		items,
		op: 'AND',
	}).expression;

	const parent = parentExpression?.trim();
	if (parent && metaExpression) {
		return `${parent} AND ${metaExpression}`;
	}
	return parent || metaExpression;
}

export interface EventsExpressionParams {
	objectKind: string;
	objectName: string;
	clusterName?: string | null;
	namespaceName?: string | null;
}

export function buildEventsExpression(params: EventsExpressionParams): string {
	const clauses: string[] = [
		`${INFRA_MONITORING_ATTR_KEYS.K8S_OBJECT_KIND} = ${formatValueForExpression(params.objectKind)}`,
		`${INFRA_MONITORING_ATTR_KEYS.K8S_OBJECT_NAME} = ${formatValueForExpression(params.objectName)}`,
	];

	if (params.clusterName) {
		clauses.push(
			`${INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME} = ${formatValueForExpression(params.clusterName)}`,
		);
	}

	// the other attributes are resource., and fallbacks correctly without prefix
	// this one needs attribute. prefix otherwise it fails the query
	if (params.namespaceName) {
		clauses.push(
			`attribute.${INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME} = ${formatValueForExpression(params.namespaceName)}`,
		);
	}

	return clauses.join(' AND ');
}

export interface LogsTracesExpressionParams {
	mainAttributeKey: string;
	mainAttributeValue?: string | null;
	clusterName?: string | null;
	namespaceName?: string | null;
}

export function buildLogsTracesExpression(
	params: LogsTracesExpressionParams,
): string {
	const clauses: string[] = [];

	if (params.mainAttributeValue) {
		clauses.push(
			`${params.mainAttributeKey} = ${formatValueForExpression(params.mainAttributeValue)}`,
		);
	}

	if (params.clusterName) {
		clauses.push(
			`${INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME} = ${formatValueForExpression(params.clusterName)}`,
		);
	}

	if (params.namespaceName) {
		clauses.push(
			`${INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME} = ${formatValueForExpression(params.namespaceName)}`,
		);
	}

	return clauses.join(' AND ');
}

export function buildExpressionFromSelectedItemParams(
	params: SelectedItemParams,
	mainAttributeKey: string,
): string {
	const clauses: string[] = [];

	if (params.selectedItem) {
		clauses.push(
			`${mainAttributeKey} = ${formatValueForExpression(params.selectedItem)}`,
		);
	}
	if (params.clusterName) {
		clauses.push(
			`${INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME} = ${formatValueForExpression(params.clusterName)}`,
		);
	}
	if (params.namespaceName) {
		clauses.push(
			`${INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME} = ${formatValueForExpression(params.namespaceName)}`,
		);
	}

	return clauses.join(' AND ');
}

/**
 * Link to the k8s list page for `targetCategory`, pre-filtered by `filterExpression`
 * and carrying whichever time range (list or drawer) the current URL holds.
 */
export function buildK8sListNavigationUrl(
	targetCategory: InfraMonitoringEntity,
	filterExpression: string,
): string {
	const defaultQuery = initialQueriesMap[DataSource.METRICS];

	const compositeQuery = {
		...defaultQuery,
		id: uuid(),
		builder: {
			...defaultQuery.builder,
			queryData: defaultQuery.builder.queryData.map((query) => ({
				...query,
				filter: { expression: filterExpression },
				filters: { items: [], op: 'AND' as const },
			})),
		},
	};

	const urlParams = new URLSearchParams();
	urlParams.set(INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY, targetCategory);
	urlParams.set(
		QueryParams.compositeQuery,
		encodeURIComponent(JSON.stringify(compositeQuery)),
	);

	const currentSearchParams = new URLSearchParams(window.location.search);
	const detailRelativeTime = currentSearchParams.get(
		INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_RELATIVE_TIME,
	);
	const detailStartTime = currentSearchParams.get(
		INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_START_TIME,
	);
	const detailEndTime = currentSearchParams.get(
		INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_END_TIME,
	);

	const listRelativeTime = currentSearchParams.get(QueryParams.relativeTime);
	const listStartTime = currentSearchParams.get(QueryParams.startTime);
	const listEndTime = currentSearchParams.get(QueryParams.endTime);

	if (listRelativeTime) {
		urlParams.set(QueryParams.relativeTime, listRelativeTime);
	} else if (listStartTime && listEndTime) {
		urlParams.set(QueryParams.startTime, listStartTime);
		urlParams.set(QueryParams.endTime, listEndTime);
	}

	if (detailRelativeTime) {
		urlParams.set(
			INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_RELATIVE_TIME,
			detailRelativeTime,
		);
	} else if (detailStartTime && detailEndTime) {
		urlParams.set(
			INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_START_TIME,
			detailStartTime,
		);
		urlParams.set(
			INFRA_MONITORING_K8S_PARAMS_KEYS.DETAIL_END_TIME,
			detailEndTime,
		);
	}

	return `${ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES}?${urlParams.toString()}`;
}
