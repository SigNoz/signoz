/*
 * jsx-a11y/control-has-associated-label mis-fires on non-interactive data-table
 * rows/cells whose content is a wrapping element (a flex container, badge, or
 * loading bar) rather than a direct text node — a `<tr>`/`<td>` is not a control,
 * and the real controls here (toggle, kebab, add-button) carry their own labels.
 */
/* eslint-disable jsx-a11y/control-has-associated-label */
import { useEffect } from 'react';
import { Button } from '@signozhq/ui/button';
import { Switch } from '@signozhq/ui/switch';
import { ChevronDown, ChevronRight, Plus } from '@signozhq/icons';
import { useListSpanMappers } from 'api/generated/services/spanmapper';
import { Skeleton } from 'antd';
import cx from 'classnames';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { DraftGroup, DraftMapper, Mapper } from '../../../types';
import { AttributeMappingStore } from '../../hooks/useAttributeMappingStore';
import MapperGroupActionsMenu from './MapperGroupActionsMenu';
import { COLUMN_COUNT } from './constants';
import MapperRow from './MapperRow';
import styles from './MappingsTable.module.scss';

const MAPPER_SKELETON_ROWS = 2;

// Fade shared by the non-row states (skeleton / error / empty / add-mapping) so
// they reveal in step with the mapper rows on expand and fade back out on
// collapse. Wrapped in AnimatePresence below so the exit runs before unmount,
// making expand/collapse read as one accordion rather than a snap.
const STATE_ROW_MOTION = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
	transition: { duration: 0.18, ease: 'easeOut' },
} as const;

interface GroupSectionProps {
	group: DraftGroup;
	store: AttributeMappingStore;
	expanded: boolean;
	onToggleExpanded: (localId: string) => void;
	onEditGroup: (group: DraftGroup) => void;
	onAddMapper: (groupLocalId: string) => void;
	onEditMapper: (groupLocalId: string, mapper: DraftMapper) => void;
}

// One group rendered as a `<tbody>` section: a full-width collapsible header row
// (name + mapping count + toggle + actions) followed, when expanded, by its
// mapper rows aligned to the shared columns. A group's mappers are fetched
// lazily on first expand — the query stays disabled until then, so page load is
// a single groups request rather than an N+1 fan-out. New (unsaved) groups have
// no serverId, so they skip the fetch entirely.
function GroupSection({
	group,
	store,
	expanded,
	onToggleExpanded,
	onEditGroup,
	onAddMapper,
	onEditMapper,
}: GroupSectionProps): JSX.Element {
	const { hydrateGroupMappers, removeMapper, toggleMapper } = store;
	const prefersReducedMotion = useReducedMotion();
	const stateRowMotion = prefersReducedMotion
		? { initial: false as const }
		: STATE_ROW_MOTION;

	const hasServerId = group.serverId !== null;
	const { data, isLoading, isError } = useListSpanMappers(
		{ groupId: group.serverId ?? '' },
		{ query: { enabled: expanded && hasServerId } },
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
	const mapperCount = group.mappers.length;
	// Condition keys (attribute + resource) ship with the group up front, so this
	// count is always trustworthy — shown regardless of expand state.
	const conditionCount = group.attributes.length + group.resource.length;
	// Mappers load lazily on first expand, so the count is only trustworthy once
	// the group has been opened (or already carries staged/loaded mappers). Hiding
	// it for never-opened groups avoids a misleading "0 mappings".
	const showCount = expanded || mapperCount > 0;

	// Skeleton mapper rows, shaped per aligned column (target · sources · writes-to
	// · actions) so the lazy per-group load mirrors real rows rather than flat bars.
	// Plain <tr> (not motion) on purpose: once the mappers arrive we want the
	// skeleton to be replaced instantly, with no exit fade cross-dissolving against
	// the incoming rows. antd's `active` shimmer covers the loading feel on its own.
	const skeletonRows = Array.from({ length: MAPPER_SKELETON_ROWS }).map(
		(_, index) => (
			<tr
				// eslint-disable-next-line react/no-array-index-key
				key={`mapper-skeleton-${index}`}
				className={styles.mapperRow}
			>
				<td className={cx(styles.cell, styles.targetCell)}>
					<Skeleton.Input active size="small" style={{ width: '55%' }} />
				</td>
				<td className={styles.cell}>
					<div className={styles.sources}>
						<Skeleton.Button active size="small" style={{ width: 88 }} />
						<Skeleton.Button active size="small" style={{ width: 56 }} />
					</div>
				</td>
				<td className={styles.cell}>
					<Skeleton.Button active size="small" style={{ width: 72 }} />
				</td>
				<td className={cx(styles.cell, styles.actionsCell)}>
					<div className={styles.rowActions}>
						<Skeleton.Button active size="small" shape="round" />
						<Skeleton.Avatar active size={16} shape="square" />
					</div>
				</td>
			</tr>
		),
	);

	const errorRow = (
		<motion.tr key="error" className={styles.mapperStateRow} {...stateRowMotion}>
			<td
				colSpan={COLUMN_COUNT}
				className={styles.stateCell}
				data-testid={`mappers-error-${group.localId}`}
			>
				Failed to load mappings. Please try again.
			</td>
		</motion.tr>
	);

	const emptyRow = (
		<motion.tr key="empty" className={styles.mapperStateRow} {...stateRowMotion}>
			<td
				colSpan={COLUMN_COUNT}
				className={styles.stateCell}
				data-testid={`mappers-empty-${group.localId}`}
			>
				No mappings in this group yet.
			</td>
		</motion.tr>
	);

	const addMapperRow = (
		<motion.tr
			key="add-mapper"
			className={styles.addMapperRow}
			{...stateRowMotion}
		>
			<td colSpan={COLUMN_COUNT} className={styles.stateCell}>
				<Button
					variant="link"
					color="primary"
					size="sm"
					prefix={<Plus size={14} />}
					onClick={(): void => onAddMapper(group.localId)}
					testId={`add-mapper-${group.localId}`}
				>
					Add mapping
				</Button>
			</td>
		</motion.tr>
	);

	const mapperRows = group.mappers.map((mapper, index) => (
		<MapperRow
			key={mapper.localId}
			mapper={mapper}
			index={index}
			onEdit={(next): void => onEditMapper(group.localId, next)}
			onRemove={(localId): void => removeMapper(group.localId, localId)}
			onToggle={(localId, enabled): void =>
				toggleMapper(group.localId, localId, enabled)
			}
		/>
	));

	// Rows revealed on expand, assembled as a keyed list so AnimatePresence can
	// run the per-row enter/exit fade on expand and collapse. The add-mapping row
	// trails every non-error state (including loading/empty).
	let expandedRows: JSX.Element[] = [];
	if (expanded && isErrorMappers) {
		expandedRows = [errorRow];
	} else if (expanded && isLoadingMappers && mapperCount === 0) {
		expandedRows = [...skeletonRows, addMapperRow];
	} else if (expanded && mapperCount === 0) {
		expandedRows = [emptyRow, addMapperRow];
	} else if (expanded) {
		expandedRows = [...mapperRows, addMapperRow];
	}

	return (
		<tbody className={styles.groupSection}>
			<tr className={styles.groupHeaderRow}>
				<td colSpan={COLUMN_COUNT} className={styles.groupHeaderCell}>
					<div className={styles.groupHeader}>
						<button
							type="button"
							className={styles.groupHeaderToggle}
							aria-label={expanded ? 'Collapse group' : 'Expand group'}
							aria-expanded={expanded}
							onClick={(): void => onToggleExpanded(group.localId)}
							data-testid={`group-expand-${group.localId}`}
						>
							{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
							<span
								className={styles.groupName}
								data-testid={`group-name-${group.localId}`}
							>
								{group.name}
							</span>
							<span
								className={styles.groupCount}
								data-testid={`group-condition-count-${group.localId}`}
							>
								· {conditionCount} {conditionCount === 1 ? 'condition' : 'conditions'}
							</span>
							{showCount && (
								<span className={styles.groupCount}>
									· {mapperCount} {mapperCount === 1 ? 'mapping' : 'mappings'}
								</span>
							)}
						</button>
						<div className={styles.rowActions}>
							<Switch
								value={group.enabled}
								onChange={(checked): void => store.toggleGroup(group.localId, checked)}
								testId={`group-enabled-${group.localId}`}
							/>
							<MapperGroupActionsMenu
								group={group}
								onEdit={onEditGroup}
								onRemove={store.removeGroup}
							/>
						</div>
					</div>
				</td>
			</tr>
			<AnimatePresence initial={false}>{expandedRows}</AnimatePresence>
		</tbody>
	);
}

export default GroupSection;
