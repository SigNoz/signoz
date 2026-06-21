import { useCallback, useEffect, useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { Plus } from '@signozhq/icons';
import { useListSpanMappers } from 'api/generated/services/spanmapper';
import TanStackTable from 'components/TanStackTableView';

import styles from './LLMObservabilityAttributeMapping.module.scss';
import MapperFormDrawer from './MapperFormDrawer';
import { getMappersColumns } from './mappers.config';
import { DraftGroup, DraftMapper, Mapper } from './types';
import { AttributeMappingStore } from './useAttributeMappingStore';
import { useMapperFormDrawer } from './useMapperFormDrawer';

const SKELETON_ROW_COUNT = 3;

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
	const drawer = useMapperFormDrawer();
	const { hydrateGroupMappers, upsertMapper, removeMapper, toggleMapper } = store;

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
		<div className={styles.mappersTableWrapper}>
			{content}

			<Button
				variant="ghost"
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
		</div>
	);
}

export default MappersTable;
