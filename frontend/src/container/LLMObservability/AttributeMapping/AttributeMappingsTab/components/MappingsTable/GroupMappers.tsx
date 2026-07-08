/*
 * jsx-a11y/control-has-associated-label mis-fires on non-interactive data-table
 * rows/cells whose content is a wrapping element (a flex container, badge, or
 * loading bar) rather than a direct text node — a `<tr>`/`<td>` is not a control,
 * and the real control here (the enable toggle) carries its own label.
 */
/* eslint-disable jsx-a11y/control-has-associated-label */
import { useEffect } from 'react';
import type { SpantypesSpanMapperDTO } from 'api/generated/services/sigNoz.schemas';
import { useListSpanMappers } from 'api/generated/services/spanmapper';
import { Skeleton } from 'antd';
import cx from 'classnames';
import { motion, useReducedMotion } from 'motion/react';

import { DraftGroup } from '../../../types';
import { AttributeMappingStore } from '../../hooks/useAttributeMappingStore';
import { COLUMN_COUNT } from './constants';
import MapperRow from './MapperRow';
import MappingsColgroup from './MappingsColgroup';
import styles from './MappingsTable.module.scss';

const MAPPER_SKELETON_ROWS = 2;

// Fade shared by the non-row states (error / empty) so they reveal in step
// with the mapper rows while the antd Collapse runs its height animation on
// expand.
const STATE_ROW_MOTION = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	transition: { duration: 0.18, ease: 'easeOut' },
} as const;

interface GroupMappersProps {
	group: DraftGroup;
	store: AttributeMappingStore;
}

// A group's Collapse panel body: its mapper rows rendered in a table that
// shares the listing's colgroup, so they align to the columns of the header
// table above the Collapse. The panel only mounts while its group is expanded
// (destroyInactivePanel), so the fetch is lazy by construction — page load is
// a single groups request rather than an N+1 fan-out. The fetched mappers are
// folded into the store's draft (once per group), which is what the rows and
// their enable toggles are driven by.
function GroupMappers({ group, store }: GroupMappersProps): JSX.Element {
	const { hydrateGroupMappers, toggleMapper } = store;
	const prefersReducedMotion = useReducedMotion();
	const stateRowMotion = prefersReducedMotion
		? { initial: false as const }
		: STATE_ROW_MOTION;

	const { data, isLoading, isError } = useListSpanMappers(
		{ groupId: group.serverId ?? '' },
		{ query: { enabled: group.serverId !== null } },
	);

	useEffect(() => {
		const items = data?.data?.items;
		if (group.serverId && items) {
			// The generated schema mis-types this list response with the groups DTO;
			// the runtime payload is mappers.
			hydrateGroupMappers(
				group.serverId,
				items as unknown as SpantypesSpanMapperDTO[],
			);
		}
	}, [group.serverId, data, hydrateGroupMappers]);

	const mapperCount = group.mappers.length;

	// Skeleton mapper rows, shaped per aligned column (target · sources ·
	// writes-to · status) so the lazy per-group load mirrors real rows rather
	// than flat bars. Plain <tr> (not motion) on purpose: once the mappers
	// arrive we want the skeleton to be replaced instantly, with no fade
	// cross-dissolving against the incoming rows. antd's `active` shimmer covers
	// the loading feel on its own.
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
				<td className={cx(styles.cell, styles.statusCell)}>
					<div className={styles.rowActions}>
						<Skeleton.Button active size="small" shape="round" />
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

	const mapperRows = group.mappers.map((mapper, index) => (
		<MapperRow
			key={mapper.localId}
			mapper={mapper}
			index={index}
			onToggle={(localId, enabled): void =>
				toggleMapper(group.localId, localId, enabled)
			}
		/>
	));

	let rows: JSX.Element[];
	if (isError) {
		rows = [errorRow];
	} else if (isLoading && mapperCount === 0) {
		rows = skeletonRows;
	} else if (mapperCount === 0) {
		rows = [emptyRow];
	} else {
		rows = mapperRows;
	}

	return (
		<table className={styles.table}>
			<MappingsColgroup />
			<tbody>{rows}</tbody>
		</table>
	);
}

export default GroupMappers;
