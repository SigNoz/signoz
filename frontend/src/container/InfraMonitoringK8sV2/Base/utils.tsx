import { Badge } from '@signozhq/ui/badge';

import styles from './utils.module.scss';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import {
	convertFiltersToExpression,
	formatValueForExpression,
} from 'components/QueryBuilderV2/utils';
import { SelectedItemParams } from 'container/InfraMonitoringK8sV2/hooks';
import { INFRA_MONITORING_ATTR_KEYS } from 'container/InfraMonitoringK8sV2/constants';

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
