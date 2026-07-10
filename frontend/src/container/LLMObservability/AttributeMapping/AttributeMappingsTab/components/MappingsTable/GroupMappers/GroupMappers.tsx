import { useListSpanMappers } from 'api/generated/services/spanmapper';
import { motion } from 'motion/react';

import {
	MappingGroup,
	Mapping,
} from 'container/LLMObservability/AttributeMapping/types';
import { buildMappingsFromListResponse } from 'container/LLMObservability/AttributeMapping/utils';
import { COLUMN_COUNT } from '../constants';
import MapperRow, { MapperRowSkeleton } from '../MapperRow';
import MappingsColgroup from '../MappingsColgroup';
import styles from './GroupMappers.module.scss';

const MAPPER_SKELETON_ROWS = 1;

const STATE_ROW_MOTION = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	transition: { duration: 0.18, ease: 'easeOut' },
} as const;

interface StateRowProps {
	groupId: string;
}

function ErrorRow({ groupId }: StateRowProps): JSX.Element {
	return (
		<motion.tr className={styles.mapperStateRow} {...STATE_ROW_MOTION}>
			<td
				colSpan={COLUMN_COUNT}
				className={styles.stateCell}
				data-testid={`mappers-error-${groupId}`}
			>
				Failed to load mappings. Please try again.
			</td>
		</motion.tr>
	);
}

function EmptyRow({ groupId }: StateRowProps): JSX.Element {
	return (
		<motion.tr className={styles.mapperStateRow} {...STATE_ROW_MOTION}>
			<td
				colSpan={COLUMN_COUNT}
				className={styles.stateCell}
				data-testid={`mappers-empty-${groupId}`}
			>
				No mappings in this group yet.
			</td>
		</motion.tr>
	);
}

interface GroupMappersProps {
	group: MappingGroup;
}

function GroupMappers({ group }: GroupMappersProps): JSX.Element {
	const {
		data: mappers = [],
		isLoading,
		isError,
	} = useListSpanMappers<Mapping[]>(
		{
			groupId: group.id,
		},
		{
			query: {
				refetchOnMount: false,
				select: buildMappingsFromListResponse,
			},
		},
	);

	let rows: JSX.Element[];
	if (isError) {
		rows = [<ErrorRow key="error" groupId={group.id} />];
	} else if (isLoading) {
		rows = Array.from({ length: MAPPER_SKELETON_ROWS }).map((_, index) => (
			<MapperRowSkeleton key={`mapper-skeleton-${index}`} />
		));
	} else if (mappers.length === 0) {
		rows = [<EmptyRow key="empty" groupId={group.id} />];
	} else {
		rows = mappers.map((mapper, index) => (
			<MapperRow key={mapper.id} mapper={mapper} index={index} />
		));
	}

	return (
		<table className={styles.table}>
			<MappingsColgroup />
			<tbody>{rows}</tbody>
		</table>
	);
}

export default GroupMappers;
