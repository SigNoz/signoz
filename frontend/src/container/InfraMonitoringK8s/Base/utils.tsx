import { Badge } from '@signozhq/ui';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import styles from './utils.module.scss';

const dotToUnder: Record<string, string> = {
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
};

export function getGroupedByMeta<T extends { meta: Record<string, string> }>(
	itemData: T,
	groupBy: BaseAutocompleteData[],
): Record<string, string> {
	const result: Record<string, string> = {};

	groupBy.forEach((group) => {
		const rawKey = group.key as string;
		const metaKey = (dotToUnder[rawKey] ?? rawKey) as keyof typeof itemData.meta;
		result[rawKey] = (itemData.meta[metaKey] || itemData.meta[rawKey]) ?? '';
	});

	return result;
}

export function getRowKey<T extends { meta: Record<string, string> }>(
	itemData: T,
	getItemIdentifier: () => string,
	groupBy: BaseAutocompleteData[],
): string {
	const nodeIdentifier = getItemIdentifier();

	if (groupBy.length === 0) {
		return nodeIdentifier || JSON.stringify(itemData.meta);
	}

	const groupedMeta = getGroupedByMeta(itemData, groupBy);
	const groupKey = Object.values(groupedMeta).join('-');

	if (groupKey && nodeIdentifier) {
		return `${groupKey}-${nodeIdentifier}`;
	}
	if (groupKey) {
		return groupKey;
	}
	if (nodeIdentifier) {
		return nodeIdentifier;
	}

	return JSON.stringify(itemData.meta);
}

export function getGroupByEl<T extends { meta: Record<string, string> }>(
	itemData: T,
	groupBy: IBuilderQuery['groupBy'],
): React.ReactNode {
	const groupByValues: string[] = [];

	groupBy.forEach((group) => {
		const rawKey = group.key as string;

		// Choose mapped key if present, otherwise use rawKey
		const metaKey = (dotToUnder[rawKey] ?? rawKey) as keyof typeof itemData.meta;
		const value = itemData.meta[metaKey] || itemData.meta[rawKey] || '<no-value>';

		groupByValues.push(value);
	});

	return (
		<div className={styles.itemDataGroup}>
			{groupByValues.map((value) => (
				<Badge
					key={value}
					color="secondary"
					className={styles.itemDataGroupTagItem}
				>
					{value === '' ? '<no-value>' : value}
				</Badge>
			))}
		</div>
	);
}
