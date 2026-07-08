import { useMemo } from 'react';
import type { SpantypesSpanMapperDTO } from 'api/generated/services/sigNoz.schemas';
import { useListSpanMappers } from 'api/generated/services/spanmapper';
import { motion, useReducedMotion } from 'motion/react';

import {
	DraftGroup,
	Mapping,
} from 'container/LLMObservability/AttributeMapping/types';
import { buildMapping } from 'container/LLMObservability/AttributeMapping/utils';
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
	group: DraftGroup;
}

function GroupMappers({ group }: GroupMappersProps): JSX.Element {
	const prefersReducedMotion = useReducedMotion();
	const stateRowMotion = prefersReducedMotion
		? { initial: false as const }
		: STATE_ROW_MOTION;

	// A not-yet-saved group has no serverId, so there is nothing to fetch —
	// the query stays disabled and the panel falls through to the empty row.
	const hasServerId = group.serverId !== null;
	const { data, isLoading, isError } = useListSpanMappers(
		{
			groupId: group.serverId ?? '',
		},
		{
			query: {
				enabled: hasServerId,
				refetchOnMount: false,
			},
		},
	);

	const mappers = useMemo<Mapping[]>(() => {
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
