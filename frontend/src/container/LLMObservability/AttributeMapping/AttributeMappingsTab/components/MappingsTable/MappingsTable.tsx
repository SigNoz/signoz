import { useState } from 'react';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import { Collapse, type CollapseProps, Skeleton } from 'antd';

import { AttributeMappingStore } from '../../hooks/useAttributeMappingStore';
import GroupHeader from './GroupHeader';
import GroupHeaderActions from './GroupHeaderActions';
import GroupMappers from './GroupMappers';
import MappingsColgroup from './MappingsColgroup';
import styles from './MappingsTable.module.scss';

const SKELETON_ROW_COUNT = 5;

interface MappingsTableProps {
	store: AttributeMappingStore;
}

// Single, GitHub-style listing: one shared column header, groups as collapsible
// full-width banner rows, and each group's mappers rendered as rows aligned to
// the shared columns. The accordion itself is antd Collapse (controlled
// activeKey, one item per group); the column alignment across its panels comes
// from every panel body being a fixed-layout table with the same colgroup as
// the header table (see MappingsColgroup). destroyInactivePanel keeps collapse
// semantics identical to an unmount: a closed group's rows leave the DOM and
// its mappers query disables.
function MappingsTable({ store }: MappingsTableProps): JSX.Element {
	const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

	const isEmpty = !store.isLoading && store.groups.length === 0;

	const items: CollapseProps['items'] = store.groups.map((group) => ({
		key: group.localId,
		label: <GroupHeader group={group} />,
		extra: <GroupHeaderActions group={group} />,
		children: <GroupMappers group={group} />,
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
						<Skeleton.Avatar active size={14} shape="square" />
						<Skeleton.Input
							active
							size="small"
							style={{ width: index % 2 === 0 ? 200 : 140 }}
						/>
						<Skeleton.Input active size="small" style={{ width: 64 }} />
					</div>
					<div className={styles.skeletonGroupRight}>
						<Skeleton.Button active size="small" shape="round" />
					</div>
				</div>
			))}
		</div>
	);

	if (isEmpty) {
		return (
			<div className={styles.tableEmpty} data-testid="mapper-groups-empty">
				No mapping groups yet.
			</div>
		);
	}

	return (
		<div data-testid="mappings-table">
			<table className={styles.table}>
				<MappingsColgroup />
				<thead>
					<tr className={styles.headerRow}>
						<th className={styles.headerCell}>Target</th>
						<th className={styles.headerCell}>Sources</th>
						<th className={styles.headerCell}>Writes to</th>
						<th className={styles.headerCell}>Status</th>
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
	);
}

export default MappingsTable;
