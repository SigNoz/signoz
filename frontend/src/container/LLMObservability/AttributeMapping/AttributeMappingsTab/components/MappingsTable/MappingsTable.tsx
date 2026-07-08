/*
 * jsx-a11y/control-has-associated-label mis-fires on the non-interactive
 * skeleton rows below (a `<tr>`/`<td>` is not a control). The interactive
 * elements in this table carry their own labels.
 */
/* eslint-disable jsx-a11y/control-has-associated-label */
import { useCallback, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Plus } from '@signozhq/icons';

import MapperFormDrawer from '../../../components/MapperFormDrawer';
import { DraftGroup, DraftMapper } from '../../../types';
import { useMapperFormDrawer } from '../../../useMapperFormDrawer';
import { AttributeMappingStore } from '../../hooks/useAttributeMappingStore';
import { COLUMN_COUNT } from './constants';
import GroupSection from './GroupSection';
import styles from './MappingsTable.module.scss';

const SKELETON_ROW_COUNT = 5;

interface MappingsTableProps {
	store: AttributeMappingStore;
	onEditGroup: (group: DraftGroup) => void;
	onAddGroup: () => void;
}

// Single, GitHub-style listing: one table with one header, groups as collapsible
// full-width header rows, and each group's mappers rendered as rows aligned to
// the shared columns (replacing the old outer-groups + nested-mappers double
// table). The mapper drawer lives here once — a target group is tracked so a
// single instance serves add/edit for whichever group triggered it.
function MappingsTable({
	store,
	onEditGroup,
	onAddGroup,
}: MappingsTableProps): JSX.Element {
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
	const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
	const drawer = useMapperFormDrawer();

	const { upsertMapper, removeMapper } = store;

	const toggleExpanded = useCallback((localId: string): void => {
		setExpandedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(localId)) {
				next.delete(localId);
			} else {
				next.add(localId);
			}
			return next;
		});
	}, []);

	const handleAddMapper = useCallback(
		(groupLocalId: string): void => {
			setTargetGroupId(groupLocalId);
			// Keep the group open so the staged row is visible after save.
			setExpandedGroups((prev) => new Set(prev).add(groupLocalId));
			drawer.openForAdd();
		},
		[drawer],
	);

	const handleEditMapper = useCallback(
		(groupLocalId: string, mapper: DraftMapper): void => {
			setTargetGroupId(groupLocalId);
			drawer.openForEdit(mapper);
		},
		[drawer],
	);

	const handleSaveMapper = useCallback((): void => {
		if (targetGroupId) {
			upsertMapper(targetGroupId, drawer.draft);
		}
		drawer.close();
	}, [targetGroupId, upsertMapper, drawer]);

	const handleDeleteMapper = useCallback((): void => {
		if (targetGroupId && drawer.draft.id) {
			removeMapper(targetGroupId, drawer.draft.id);
		}
		drawer.close();
	}, [targetGroupId, removeMapper, drawer]);

	const isEmpty = !store.isLoading && store.groups.length === 0;

	return (
		<div className={styles.tableWrapper}>
			<div className={styles.toolbar}>
				<Button
					variant="link"
					color="primary"
					prefix={<Plus size={14} />}
					onClick={onAddGroup}
					testId="add-group-row"
					disabled={store.isLoading}
				>
					Add a new group
				</Button>
			</div>

			{isEmpty ? (
				<div className={styles.tableEmpty} data-testid="mapper-groups-empty">
					No mapping groups yet.
				</div>
			) : (
				<table className={styles.table} data-testid="mappings-table">
					<colgroup>
						<col className={styles.colTarget} />
						<col className={styles.colSources} />
						<col className={styles.colWritesTo} />
						<col className={styles.colActions} />
					</colgroup>
					<thead>
						<tr className={styles.headerRow}>
							<th className={styles.headerCell}>Target</th>
							<th className={styles.headerCell}>Sources</th>
							<th className={styles.headerCell}>Writes to</th>
							<th className={styles.headerCell}>Actions</th>
						</tr>
					</thead>
					{store.isLoading ? (
						<tbody>
							{Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
								<tr
									// eslint-disable-next-line react/no-array-index-key
									key={`group-skeleton-${index}`}
									className={styles.groupHeaderRow}
								>
									<td colSpan={COLUMN_COUNT} className={styles.groupHeaderCell}>
										<div className={styles.skeletonBar} />
									</td>
								</tr>
							))}
						</tbody>
					) : (
						store.groups.map((group) => (
							<GroupSection
								key={group.localId}
								group={group}
								store={store}
								expanded={expandedGroups.has(group.localId)}
								onToggleExpanded={toggleExpanded}
								onEditGroup={onEditGroup}
								onAddMapper={handleAddMapper}
								onEditMapper={handleEditMapper}
							/>
						))
					)}
				</table>
			)}

			{drawer.isOpen && (
				<MapperFormDrawer
					isOpen={drawer.isOpen}
					mode={drawer.mode}
					draft={drawer.draft}
					setDraft={drawer.setDraft}
					onClose={drawer.close}
					onSave={handleSaveMapper}
					onDelete={handleDeleteMapper}
					isSaving={false}
					isDeleting={false}
					saveError={null}
				/>
			)}
		</div>
	);
}

export default MappingsTable;
