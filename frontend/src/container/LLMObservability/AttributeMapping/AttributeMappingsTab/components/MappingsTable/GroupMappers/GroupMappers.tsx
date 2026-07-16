import { useEffect } from 'react';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { ArrowLeftRight, Plus, TriangleAlert } from '@signozhq/icons';
import { useListSpanMappers } from 'api/generated/services/spanmapper';
import { motion } from 'motion/react';

import {
	DraftGroup,
	DraftMapper,
	Mapper,
} from 'container/LLMObservability/AttributeMapping/types';
import { AttributeMappingEditor } from 'container/LLMObservability/AttributeMapping/hooks/useAttributeMappingEditor';
import { COLUMN_COUNT } from '../constants';
import MapperRow from '../MapperRow/MapperRow';
import MapperRowSkeleton from '../MapperRow/MapperRowSkeleton';
import MappingsColgroup from '../MappingsColgroup/MappingsColgroup';
import styles from './GroupMappers.module.scss';

const MAPPER_SKELETON_ROWS = 1;

const STATE_ROW_MOTION = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	transition: { duration: 0.18, ease: 'easeOut' },
} as const;

interface GroupMappersProps {
	group: DraftGroup;
	editor: AttributeMappingEditor;
	onAddMapper: (groupLocalId: string) => void;
	onEditMapper: (groupLocalId: string, mapper: DraftMapper) => void;
}

function GroupMappers({
	group,
	editor,
	onAddMapper,
	onEditMapper,
}: GroupMappersProps): JSX.Element {
	const { hydrateGroupMappers, removeMapper, toggleMapper } = editor;

	const hasServerId = group.serverId !== null;
	const { data, isLoading, isError } = useListSpanMappers(
		{ groupId: group.serverId ?? '' },
		// refetchOnMount: false — the Collapse destroys inactive panels, so a
		// group's mappers would otherwise refetch on every expand. Cached data is
		// reused instead; the save flow evicts these caches so post-edit expands
		// still fetch fresh.
		{ query: { enabled: hasServerId, refetchOnMount: false } },
	);

	useEffect(() => {
		const items = data?.data?.items;
		if (group.serverId && items) {
			hydrateGroupMappers(group.serverId, items as unknown as Mapper[]);
		}
	}, [group.serverId, data, hydrateGroupMappers]);

	const isLoadingMappers = hasServerId && isLoading;
	const isErrorMappers = hasServerId && isError;
	const mapperCount = group.mappers.length;

	const skeletonRows = Array.from({ length: MAPPER_SKELETON_ROWS }).map(
		(_, index) => (
			// eslint-disable-next-line react/no-array-index-key
			<MapperRowSkeleton key={`mapper-skeleton-${index}`} />
		),
	);

	const errorRow = (
		<motion.tr
			key="error"
			className={styles.mapperStateRow}
			{...STATE_ROW_MOTION}
		>
			<td
				colSpan={COLUMN_COUNT}
				className={styles.stateCell}
				data-testid={`mappers-error-${group.localId}`}
			>
				<span className={styles.stateContent}>
					<TriangleAlert size={14} color="var(--danger-background)" />
					<Typography.Text as="span" size="base">
						Failed to load mappings. Please try again.
					</Typography.Text>
				</span>
			</td>
		</motion.tr>
	);

	const emptyRow = (
		<motion.tr
			key="empty"
			className={styles.mapperStateRow}
			{...STATE_ROW_MOTION}
		>
			<td
				colSpan={COLUMN_COUNT}
				className={styles.stateCell}
				data-testid={`mappers-empty-${group.localId}`}
			>
				<span className={styles.stateContent}>
					<ArrowLeftRight size={14} />
					<Typography.Text as="span" size="base" color="muted">
						No mappings in this group yet.
					</Typography.Text>
				</span>
			</td>
		</motion.tr>
	);

	const addMapperRow = (
		<motion.tr
			key="add-mapper"
			className={styles.addMapperRow}
			{...STATE_ROW_MOTION}
		>
			<td colSpan={COLUMN_COUNT} className={styles.addMapperCell}>
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

	// The add-mapping row trails every non-error state (including loading/empty).
	let rows: JSX.Element[];
	if (isErrorMappers) {
		rows = [errorRow];
	} else if (isLoadingMappers && mapperCount === 0) {
		rows = [...skeletonRows, addMapperRow];
	} else if (mapperCount === 0) {
		rows = [emptyRow, addMapperRow];
	} else {
		rows = [...mapperRows, addMapperRow];
	}

	return (
		<table className={styles.table}>
			<MappingsColgroup />
			<tbody>{rows}</tbody>
		</table>
	);
}

export default GroupMappers;
