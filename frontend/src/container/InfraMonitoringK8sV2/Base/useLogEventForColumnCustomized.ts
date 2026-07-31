import { useEffect, useMemo, useRef } from 'react';
import {
	TableColumnDef,
	useColumnOrder,
	useHiddenColumnIds,
} from 'components/TanStackTableView';
import { logInfraColumnCustomizedEvent } from 'constants/events';

import { InfraMonitoringEntity } from '../constants';

import {
	useInfraMonitoringFontSize,
	useInfraMonitoringLineClamp,
} from './useInfraMonitoringTablePreferencesStore';
import { sortByColumnOrder } from './utils';

interface UseEmitColumnCustomizedParams<TData> {
	entity: InfraMonitoringEntity;
	source: 'list' | 'expanded';
	storageKey: string;
	columns: TableColumnDef<TData>[];
}

// Multiple instances of this hook can share a storageKey (every expanded group
// row mounts one), so the last emitted payload is tracked per key to collapse
// their simultaneous effect runs into a single event.
const lastEmittedPayloadByKey = new Map<string, string>();

export function useLogEventForColumnCustomized<TData>({
	entity,
	source,
	storageKey,
	columns,
}: UseEmitColumnCustomizedParams<TData>): void {
	const hiddenColumnIds = useHiddenColumnIds(storageKey);
	const columnOrder = useColumnOrder(storageKey);
	const fontSize = useInfraMonitoringFontSize();
	const lineClamp = useInfraMonitoringLineClamp();

	const hiddenBehavior =
		source === 'expanded' ? 'hidden-on-expand' : 'hidden-on-collapse';

	const orderedVisibleColumnIds = useMemo(() => {
		const visibleColumns = columns.filter(
			(col) =>
				(col.visibilityBehavior ?? 'always-visible') !== hiddenBehavior &&
				!hiddenColumnIds.includes(col.id),
		);
		return sortByColumnOrder(visibleColumns, (col) => col.id, columnOrder).map(
			(col) => col.id,
		);
	}, [columns, hiddenColumnIds, columnOrder, hiddenBehavior]);

	const isFirstRender = useRef(true);
	const prevStorageKeyRef = useRef(storageKey);

	// Re-arm the first-render skip when the table identity changes (the hook
	// survives category switches because K8sDynamicList keeps K8sBaseList
	// mounted), so the switch itself is not reported as a customization
	if (prevStorageKeyRef.current !== storageKey) {
		prevStorageKeyRef.current = storageKey;
		isFirstRender.current = true;
	}

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		const dedupeKey = `${storageKey}:${source}`;
		const payload = JSON.stringify([
			entity,
			orderedVisibleColumnIds,
			fontSize,
			lineClamp,
		]);
		if (lastEmittedPayloadByKey.get(dedupeKey) === payload) {
			return;
		}
		lastEmittedPayloadByKey.set(dedupeKey, payload);
		logInfraColumnCustomizedEvent(
			entity,
			orderedVisibleColumnIds,
			fontSize,
			lineClamp,
			source,
		);
	}, [entity, source, storageKey, orderedVisibleColumnIds, fontSize, lineClamp]);
}
