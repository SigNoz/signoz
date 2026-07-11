import { useEffect } from 'react';
import { Button } from '@signozhq/ui/button';
import { Plus } from '@signozhq/icons';
import { useListSpanMappers } from 'api/generated/services/spanmapper';
import { motion, useReducedMotion } from 'motion/react';

import {
	DraftGroup,
	DraftMapper,
	Mapper,
} from 'container/LLMObservability/AttributeMapping/types';
import { AttributeMappingStore } from 'container/LLMObservability/AttributeMapping/AttributeMappingsTab/hooks/useAttributeMappingStore';
import { COLUMN_COUNT } from '../constants';
import MapperRow, { MapperRowSkeleton } from '../MapperRow';
import MappingsColgroup from '../MappingsColgroup';
import styles from './GroupMappers.module.scss';

const MAPPER_SKELETON_ROWS = 1;

// Fade shared by the non-row states (skeleton / error / empty / add-mapping) so
// they reveal in step with the mapper rows while the antd Collapse runs its
// height animation on expand.
const STATE_ROW_MOTION = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	transition: { duration: 0.18, ease: 'easeOut' },
} as const;

interface GroupMappersProps {
	group: DraftGroup;
	store: AttributeMappingStore;
	onAddMapper: (groupLocalId: string) => void;
	onEditMapper: (groupLocalId: string, mapper: DraftMapper) => void;
}

// A group's Collapse panel body: its mapper rows rendered in a table that
// shares the listing's colgroup, so they align to the columns of the header
// table above the Collapse. The panel only mounts while its group is expanded
// (destroyInactivePanel), so the fetch is lazy by construction — page load is
// a single groups request rather than an N+1 fan-out. New (unsaved) groups
// have no serverId, so they skip the fetch entirely.
function GroupMappers({
	group,
	store,
	onAddMapper,
	onEditMapper,
}: GroupMappersProps): JSX.Element {
	const { hydrateGroupMappers, removeMapper, toggleMapper } = store;
	const prefersReducedMotion = useReducedMotion();
	const stateRowMotion = prefersReducedMotion
		? { initial: false as const }
		: STATE_ROW_MOTION;

	const hasServerId = group.serverId !== null;
	const { data, isLoading, isError } = useListSpanMappers(
		{ groupId: group.serverId ?? '' },
		{ query: { enabled: hasServerId } },
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
