import { useMemo } from 'react';
import TanStackTable from 'components/TanStackTableView';

import { DraftGroup } from '../../../types';
import { AttributeMappingStore } from '../../hooks/useAttributeMappingStore';
import MappersTable from '../MappersTable';
import styles from './MapperGroupsTable.module.scss';
import { getMapperGroupsColumns } from './TableConfig';

const SKELETON_ROW_COUNT = 5;

interface MapperGroupsTableProps {
	store: AttributeMappingStore;
}

// Top-level listing of mapping groups. Each row expands to reveal its mappers,
// which MappersTable fetches lazily on first open. Built on the shared
// TanStackTable with virtual scroll disabled — this is a small, content-height
// list, and nested expanded tables need to grow with their content rather than
// live inside a fixed-height viewport.
function MapperGroupsTable({ store }: MapperGroupsTableProps): JSX.Element {
	const columns = useMemo(() => getMapperGroupsColumns(), []);

	if (!store.isLoading && store.groups.length === 0) {
		return (
			<div className={styles.tableEmpty} data-testid="mapper-groups-empty">
				No mapping groups yet.
			</div>
		);
	}

	return (
		<TanStackTable<DraftGroup>
			className={styles.groupsTableWrapper}
			data={store.groups}
			columns={columns}
			isLoading={store.isLoading}
			skeletonRowCount={SKELETON_ROW_COUNT}
			getRowKey={(row): string => row.localId}
			getRowCanExpand={(): boolean => true}
			renderExpandedRow={(row): JSX.Element => <MappersTable group={row} />}
			disableVirtualScroll
			testId="mapper-groups-table"
		/>
	);
}

export default MapperGroupsTable;
