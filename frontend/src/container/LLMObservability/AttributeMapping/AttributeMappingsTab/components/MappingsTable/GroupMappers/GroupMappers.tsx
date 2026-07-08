/*
 * jsx-a11y/control-has-associated-label mis-fires on non-interactive data-table
 * rows/cells whose content is a wrapping element (a flex container, badge, or
 * loading bar) rather than a direct text node — a `<tr>`/`<td>` is not a control,
 * and the read-only status switch carries its own label.
 */
/* eslint-disable jsx-a11y/control-has-associated-label */
import { useMemo } from 'react';
import type { SpantypesSpanMapperDTO } from 'api/generated/services/sigNoz.schemas';
import { useListSpanMappers } from 'api/generated/services/spanmapper';
import { motion, useReducedMotion } from 'motion/react';

import { MappingGroup, Mapping } from '../../../../types';
import { buildMapping } from '../../../../utils';
import { COLUMN_COUNT } from '../constants';
import MapperRow, { MapperRowSkeleton } from '../MapperRow';
import MappingsColgroup from '../MappingsColgroup';
import styles from './GroupMappers.module.scss';

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
	group: MappingGroup;
}

// A group's Collapse panel body: its mapper rows rendered in a table that
// shares the listing's colgroup, so they align to the columns of the header
// table above the Collapse. The panel only mounts while its group is expanded
// (destroyInactivePanel), so the fetch is lazy by construction — page load is
// a single groups request rather than an N+1 fan-out. Rows render straight
// from the react-query response (read-only listing); editing lands in a later
// PR.
function GroupMappers({ group }: GroupMappersProps): JSX.Element {
	const prefersReducedMotion = useReducedMotion();
	const stateRowMotion = prefersReducedMotion
		? { initial: false as const }
		: STATE_ROW_MOTION;

	// The panel mounts only while its group is expanded (destroyInactivePanel),
	// so this fetch is lazy by construction — no `enabled` guard needed.
	const { data, isLoading, isError } = useListSpanMappers({
		groupId: group.id,
	});

	const mappers = useMemo<Mapping[]>(() => {
		// The generated schema mis-types this list response with the groups DTO;
		// the runtime payload is mappers.
		const items = (data?.data?.items ??
			[]) as unknown as SpantypesSpanMapperDTO[];
		return items.map(buildMapping);
	}, [data]);

	const skeletonRows = Array.from({ length: MAPPER_SKELETON_ROWS }).map(
		(_, index) => (
			// eslint-disable-next-line react/no-array-index-key
			<MapperRowSkeleton key={`mapper-skeleton-${index}`} />
		),
	);

	const errorRow = (
		<motion.tr key="error" className={styles.mapperStateRow} {...stateRowMotion}>
			<td
				colSpan={COLUMN_COUNT}
				className={styles.stateCell}
				data-testid={`mappers-error-${group.id}`}
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
				data-testid={`mappers-empty-${group.id}`}
			>
				No mappings in this group yet.
			</td>
		</motion.tr>
	);

	const mapperRows = mappers.map((mapper, index) => (
		<MapperRow key={mapper.id} mapper={mapper} index={index} />
	));

	let rows: JSX.Element[];
	if (isError) {
		rows = [errorRow];
	} else if (isLoading) {
		rows = skeletonRows;
	} else if (mappers.length === 0) {
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
