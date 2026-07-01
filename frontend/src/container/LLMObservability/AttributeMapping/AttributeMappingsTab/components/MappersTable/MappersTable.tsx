import { useMemo } from 'react';
import { useListSpanMappers } from 'api/generated/services/spanmapper';
import TanStackTable from 'components/TanStackTableView';
import { motion, useReducedMotion } from 'motion/react';

import { DraftGroup, DraftMapper, Mapper } from '../../../types';
import { buildDraftMapper } from '../../../utils';
import styles from './MappersTable.module.scss';
import { getMappersColumns } from './TableConfig';

const SKELETON_ROW_COUNT = 3;

// Expand reveal: the panel mounts already-open, so this mount transition IS the
// group's expand animation (height + fade).
const EXPAND_TRANSITION = { duration: 0.18, ease: 'easeOut' } as const;

interface MappersTableProps {
	group: DraftGroup;
}

// Nested table of a group's mappers, rendered inside the group's expanded row.
// This component only mounts when its group row is expanded, so the fetch is
// lazy by construction — a group's mappers load on first open and are then
// cached by react-query. New (unsaved) groups have no serverId, so skip.
function MappersTable({ group }: MappersTableProps): JSX.Element {
	const prefersReducedMotion = useReducedMotion();
	const { data, isLoading, isError } = useListSpanMappers(
		{ groupId: group.serverId ?? '' },
		{ query: { enabled: group.serverId !== null } },
	);

	const mappers = useMemo<DraftMapper[]>(() => {
		// The generated schema mis-types this list response with the groups DTO;
		// the runtime payload is mappers.
		const items = (data?.data?.items ?? []) as unknown as Mapper[];
		return items.map(buildDraftMapper);
	}, [data]);

	const columns = useMemo(() => getMappersColumns(), []);

	let content: JSX.Element;
	if (!isLoading && isError) {
		content = (
			<div
				className={styles.tableEmpty}
				data-testid={`mappers-error-${group.localId}`}
			>
				Failed to load mappings. Please try again.
			</div>
		);
	} else if (!isLoading && mappers.length === 0) {
		content = (
			<div
				className={styles.tableEmpty}
				data-testid={`mappers-empty-${group.localId}`}
			>
				No mappings in this group yet.
			</div>
		);
	} else {
		content = (
			<TanStackTable<DraftMapper>
				data={mappers}
				columns={columns}
				isLoading={isLoading}
				skeletonRowCount={SKELETON_ROW_COUNT}
				getRowKey={(row): string => row.localId}
				disableVirtualScroll
				testId={`mappers-table-${group.localId}`}
			/>
		);
	}

	return (
		<motion.div
			className={styles.mappersTableWrapper}
			initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
			animate={{ height: 'auto', opacity: 1 }}
			transition={EXPAND_TRANSITION}
		>
			{content}
		</motion.div>
	);
}

export default MappersTable;
