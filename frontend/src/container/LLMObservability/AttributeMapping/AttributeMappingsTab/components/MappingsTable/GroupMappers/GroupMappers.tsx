import { useMemo } from 'react';
import type { SpantypesSpanMapperDTO } from 'api/generated/services/sigNoz.schemas';
import { useListSpanMappers } from 'api/generated/services/spanmapper';
import { motion, useReducedMotion } from 'motion/react';

import {
	MappingGroup,
	Mapping,
} from 'container/LLMObservability/AttributeMapping/types';
import { buildMapping } from 'container/LLMObservability/AttributeMapping/utils';
import { COLUMN_COUNT } from '../constants';
import MapperRow, { MapperRowSkeleton } from '../MapperRow';
import MappingsColgroup from '../MappingsColgroup';
import styles from './GroupMappers.module.scss';

const MAPPER_SKELETON_ROWS = 1;

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

function GroupMappers({ group }: GroupMappersProps): JSX.Element {
	const prefersReducedMotion = useReducedMotion();
	const stateRowMotion = prefersReducedMotion
		? { initial: false as const }
		: STATE_ROW_MOTION;

	const { data, isLoading, isError } = useListSpanMappers(
		{
			groupId: group.id,
		},
		{
			query: {
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
		(_, index) => <MapperRowSkeleton key={`mapper-skeleton-${index}`} />,
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
