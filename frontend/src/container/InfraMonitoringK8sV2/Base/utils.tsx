import { Badge } from '@signozhq/ui/badge';

import styles from './utils.module.scss';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';

const dotToUnder: Record<string, string> = {
	'os.type': 'os_type',
	'host.name': 'host_name',
	'deployment.environment': 'deployment_environment',
	'k8s.node.name': 'k8s_node_name',
	'k8s.cluster.name': 'k8s_cluster_name',
	'k8s.node.uid': 'k8s_node_uid',
	'k8s.cronjob.name': 'k8s_cronjob_name',
	'k8s.daemonset.name': 'k8s_daemonset_name',
	'k8s.deployment.name': 'k8s_deployment_name',
	'k8s.job.name': 'k8s_job_name',
	'k8s.namespace.name': 'k8s_namespace_name',
	'k8s.pod.name': 'k8s_pod_name',
	'k8s.pod.uid': 'k8s_pod_uid',
	'k8s.statefulset.name': 'k8s_statefulset_name',
	'k8s.persistentvolumeclaim.name': 'k8s_persistentvolumeclaim_name',
};

export function getGroupedByMeta<
	T extends { meta?: Record<string, string> | null },
>(itemData: T, groupBy: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	const meta = itemData.meta ?? {};

	groupBy.forEach((rawKey) => {
		const metaKey = (dotToUnder[rawKey] ?? rawKey) as keyof typeof meta;
		result[rawKey] = (meta[metaKey] || meta[rawKey]) ?? '';
	});

	return result;
}

export function getGroupByEl<
	T extends { meta?: Record<string, string> | null },
>(itemData: T, groupBy: string[]): React.ReactNode {
	const groupByValues: string[] = [];
	const meta = itemData.meta ?? {};

	groupBy.forEach((rawKey) => {
		const metaKey = (dotToUnder[rawKey] ?? rawKey) as keyof typeof meta;
		const value = meta[metaKey] || meta[rawKey] || '<no-value>';

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
