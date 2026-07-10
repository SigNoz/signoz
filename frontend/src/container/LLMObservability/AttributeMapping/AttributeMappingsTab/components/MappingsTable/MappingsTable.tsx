import { useCallback, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { ChevronDown, ChevronRight, Plus } from '@signozhq/icons';
import { Collapse, type CollapseProps, Skeleton } from 'antd';

import MapperFormDrawer from 'container/LLMObservability/AttributeMapping/components/MapperFormDrawer/MapperFormDrawer';
import { useMapperFormDrawer } from 'container/LLMObservability/AttributeMapping/components/MapperFormDrawer/hooks/useMapperFormDrawer';
import {
	DraftGroup,
	DraftMapper,
} from 'container/LLMObservability/AttributeMapping/types';
import { AttributeMappingStore } from 'container/LLMObservability/AttributeMapping/AttributeMappingsTab/hooks/useAttributeMappingStore';
import GroupHeader from './GroupHeader';
import GroupHeaderActions from './GroupHeaderActions';
import GroupMappers from './GroupMappers';
import MappingsColgroup from './MappingsColgroup';
import styles from './MappingsTable.module.scss';

const SKELETON_ROW_COUNT = 3;

interface MappingsTableProps {
	store: AttributeMappingStore;
	onEditGroup: (group: DraftGroup) => void;
	onAddGroup: () => void;
}

function MappingsTable({
	store,
	onEditGroup,
	onAddGroup,
}: MappingsTableProps): JSX.Element {
	const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
	const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
	const drawer = useMapperFormDrawer();

	const { upsertMapper, removeMapper } = store;

	const handleAddMapper = useCallback(
		(groupLocalId: string): void => {
			setTargetGroupId(groupLocalId);
			// Keep the group open so the staged row is visible after save.
			setExpandedGroups((prev) =>
				prev.includes(groupLocalId) ? prev : [...prev, groupLocalId],
			);
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

	const items: CollapseProps['items'] = store.groups.map((group) => ({
		key: group.localId,
		label: <GroupHeader group={group} />,
		extra: (
			<GroupHeaderActions
				group={group}
				onToggle={store.toggleGroup}
				onEdit={onEditGroup}
				onRemove={store.removeGroup}
			/>
		),
		children: (
			<GroupMappers
				group={group}
				store={store}
				onAddMapper={handleAddMapper}
				onEditMapper={handleEditMapper}
			/>
		),
	}));

	const skeletonBanners = (
		<div className={styles.skeletonList}>
			{Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
				<div
					// eslint-disable-next-line react/no-array-index-key
					key={`group-skeleton-${index}`}
					className={styles.skeletonBanner}
				>
					<div className={styles.skeletonGroupLeft}>
						<Skeleton.Input
							active
							size="small"
							style={{ width: index % 2 === 0 ? 200 : 140 }}
						/>
						<Skeleton.Input active size="small" style={{ width: 64 }} />
					</div>
					<div className={styles.skeletonGroupRight}>
						<Skeleton.Button active size="small" shape="round" />
						<Skeleton.Avatar active size={16} shape="square" />
					</div>
				</div>
			))}
		</div>
	);

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
				<div data-testid="mappings-table">
					<table className={styles.table}>
						<MappingsColgroup />
						<thead>
							<tr className={styles.headerRow}>
								<th className={styles.headerCell}>Target</th>
								<th className={styles.headerCell}>Sources</th>
								<th className={styles.headerCell}>Actions</th>
							</tr>
						</thead>
					</table>
					{store.isLoading ? (
						skeletonBanners
					) : (
						<Collapse
							className={styles.groupsCollapse}
							activeKey={expandedGroups}
							onChange={(keys): void =>
								setExpandedGroups(Array.isArray(keys) ? keys : [keys])
							}
							bordered={false}
							destroyInactivePanel
							expandIcon={({ isActive }): JSX.Element =>
								isActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />
							}
							items={items}
						/>
					)}
				</div>
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
