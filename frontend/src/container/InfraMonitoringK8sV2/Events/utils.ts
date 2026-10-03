import { EventRow } from '../EntityDetailsUtils/EntityEvents/hooks';
import { INFRA_MONITORING_ATTR_KEYS, K8sCategories } from '../constants';
import { EVENT_KIND_TO_CATEGORY } from './constants';
import { EventDrillDownTarget, K8sEventRow } from './types';

type EventFieldSource = Pick<
	K8sEventRow,
	'attributes_string' | 'resources_string'
>;

/**
 * Event fields land in attributes or resources depending on the collector
 * pipeline — k8sattributes promotes some to resource level — so both are
 * checked before giving up.
 */
export function readEventField(source: EventFieldSource, key: string): string {
	return source.attributes_string?.[key] ?? source.resources_string?.[key] ?? '';
}

export function isWarningSeverity(severity: string): boolean {
	const normalized = severity?.toUpperCase() ?? '';
	return (
		normalized === 'WARNING' || normalized === 'WARN' || normalized === 'ERROR'
	);
}

export function toK8sEventRow(event: EventRow): K8sEventRow {
	const source: EventFieldSource = {
		attributes_string: event.data.attributes_string,
		resources_string: event.data.resources_string,
	};

	return {
		key: event.data.id,
		id: event.data.id,
		timestamp: event.timestamp,
		body: event.data.body,
		severity: event.data.severity_text,
		kind: readEventField(source, INFRA_MONITORING_ATTR_KEYS.K8S_OBJECT_KIND),
		objectName: readEventField(
			source,
			INFRA_MONITORING_ATTR_KEYS.K8S_OBJECT_NAME,
		),
		namespace: readEventField(
			source,
			INFRA_MONITORING_ATTR_KEYS.K8S_NAMESPACE_NAME,
		),
		reason: readEventField(source, INFRA_MONITORING_ATTR_KEYS.K8S_EVENT_REASON),
		...source,
	};
}

/**
 * Pods are keyed by UID in the details drawer while every other entity is
 * keyed by name, so a Pod event is only clickable when the collector supplied
 * `k8s.object.uid`.
 */
export function getEventDrillDownTarget(
	row: K8sEventRow,
): EventDrillDownTarget | null {
	const category = EVENT_KIND_TO_CATEGORY[row.kind];
	if (!category || !row.objectName) {
		return null;
	}

	const clusterName =
		readEventField(row, INFRA_MONITORING_ATTR_KEYS.K8S_CLUSTER_NAME) || null;
	const namespaceName = row.namespace || null;

	if (category === K8sCategories.PODS) {
		const uid = readEventField(row, INFRA_MONITORING_ATTR_KEYS.K8S_OBJECT_UID);
		if (!uid) {
			return null;
		}
		return {
			category,
			params: { selectedItem: uid, clusterName, namespaceName },
		};
	}

	return {
		category,
		params: { selectedItem: row.objectName, clusterName, namespaceName },
	};
}
