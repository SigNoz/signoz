import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { Plus } from '@signozhq/icons';
import { useListSpanMappers } from 'api/generated/services/spanmapper';
import TanStackTable from 'components/TanStackTableView';
import { motion, useReducedMotion } from 'motion/react';

import MapperFormDrawer from '../../../components/MapperFormDrawer';
import { DraftGroup, DraftMapper, Mapper } from '../../../types';
import { useMapperFormDrawer } from '../../../useMapperFormDrawer';
import { AttributeMappingStore } from '../../hooks/useAttributeMappingStore';
import styles from './MappersTable.module.scss';
import { getMappersColumns } from './TableConfig';

const SKELETON_ROW_COUNT = 3;

// Expand reveal: the panel mounts already-open, so this mount transition IS the
// group's expand animation (height + fade).
const EXPAND_TRANSITION = { duration: 0.18, ease: 'easeOut' } as const;

interface MappersTableProps {
	group: DraftGroup;
	store: AttributeMappingStore;
}

// Nested table of a group's mappers, rendered inside the group's expanded row.
// This component only mounts when its group row is expanded, so the fetch is
// lazy by construction — a group's mappers load on first open, are folded into
// the store's draft so they're editable, and are then cached by react-query.
// New (unsaved) groups have no serverId, so skip the fetch.
function MappersTable({ group, store }: MappersTableProps): JSX.Element {
	const prefersReducedMotion = useReducedMotion();
	const drawer = useMapperFormDrawer();
	const { hydrateGroupMappers, upsertMapper, removeMapper, toggleMapper } =
		store;

	const hasServerId = group.serverId !== null;
	const { data, isLoading, isError } = useListSpanMappers(
		{ groupId: group.serverId ?? '' },
		{ query: { enabled: hasServerId } },
	);

	useEffect(() => {
		const items = data?.data?.items;
		if (group.serverId && items) {
			// The generated schema mis-types this list response with the groups DTO;
			// the runtime payload is mappers.
			hydrateGroupMappers(group.serverId, items as unknown as Mapper[]);
		}
	}, [group.serverId, data, hydrateGroupMappers]);

	const isLoadingMappers = hasServerId && isLoading;
	const isErrorMappers = hasServerId && isError;

	const handleSave = useCallback((): void => {
		upsertMapper(group.localId, drawer.draft);
		drawer.close();
	}, [upsertMapper, group.localId, drawer]);

	const handleDelete = useCallback((): void => {
		if (drawer.draft.id) {
			removeMapper(group.localId, drawer.draft.id);
		}
		drawer.close();
	}, [removeMapper, group.localId, drawer]);

	const columns = useMemo(
		() =>
			getMappersColumns({
				onEdit: drawer.openForEdit,
				onRemove: (localId): void => removeMapper(group.localId, localId),
				onToggle: (localId, enabled): void =>
					toggleMapper(group.localId, localId, enabled),
			}),
		[drawer.openForEdit, removeMapper, toggleMapper, group.localId],
	);

	let content: JSX.Element;
	if (isErrorMappers) {
		content = (
			<div
				className={styles.tableEmpty}
				data-testid={`mappers-error-${group.localId}`}
			>
				Failed to load mappings. Please try again.
			</div>
		);
	} else if (!isLoadingMappers && group.mappers.length === 0) {
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
				data={group.mappers}
				columns={columns}
				isLoading={isLoadingMappers}
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

			<Button
				variant="link"
				color="primary"
				size="sm"
				prefix={<Plus size={14} />}
				className={styles.addRow}
				onClick={drawer.openForAdd}
				testId={`add-mapper-${group.localId}`}
			>
				Add mapping
			</Button>

			{drawer.isOpen && (
				<MapperFormDrawer
					isOpen={drawer.isOpen}
					mode={drawer.mode}
					draft={drawer.draft}
					setDraft={drawer.setDraft}
					onClose={drawer.close}
					onSave={handleSave}
					onDelete={handleDelete}
					isSaving={false}
					isDeleting={false}
					saveError={null}
				/>
			)}
		</motion.div>
	);
}

export default MappersTable;
