import { Badge } from '@signozhq/ui/badge';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import { SpantypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { motion } from 'motion/react';

import { DraftMapper } from 'container/LLMObservability/AttributeMapping/types';
import MapperActionsMenu from '../MapperActionsMenu/MapperActionsMenu';
import styles from './MapperRow.module.scss';

const MAX_VISIBLE_SOURCES = 3;

const ROW_TRANSITION = { duration: 0.18, ease: 'easeOut' } as const;
const MAX_STAGGERED_ROWS = 6;
const STAGGER_STEP = 0.03;

interface MapperRowProps {
	mapper: DraftMapper;
	index: number;
	onEdit: (mapper: DraftMapper) => void;
	onRemove: (localId: string) => void;
	onToggle: (localId: string, enabled: boolean) => void;
}

function MapperRow({
	mapper,
	index,
	onEdit,
	onRemove,
	onToggle,
}: MapperRowProps): JSX.Element {
	const sources = mapper.sources ?? [];
	const visibleSources = sources.slice(0, MAX_VISIBLE_SOURCES);
	const remainingSources = sources.length - visibleSources.length;

	return (
		<motion.tr
			className={styles.mapperRow}
			data-testid={`mapper-row-${mapper.localId}`}
			initial={{ opacity: 0, y: -4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				...ROW_TRANSITION,
				delay: Math.min(index, MAX_STAGGERED_ROWS) * STAGGER_STEP,
			}}
		>
			<td className={cx(styles.cell, styles.targetCell)}>
				<Typography.Text
					weight="semibold"
					truncate={1}
					title={mapper.name}
					className={styles.targetName}
					data-testid={`mapper-target-${mapper.localId}`}
				>
					{mapper.name}
				</Typography.Text>
				<Badge
					color={
						mapper.fieldContext === SpantypesFieldContextDTO.resource
							? 'amber'
							: 'robin'
					}
					variant="outline"
					className={styles.targetContextBadge}
				>
					{mapper.fieldContext}
				</Badge>
			</td>
			<td className={styles.cell}>
				{sources.length === 0 ? (
					<span
						className={styles.muted}
						data-testid={`mapper-sources-${mapper.localId}`}
					>
						—
					</span>
				) : (
					<div
						className={styles.sources}
						data-testid={`mapper-sources-${mapper.localId}`}
					>
						{visibleSources.map((source) => (
							<Badge
								variant="outline"
								color="vanilla"
								className={styles.sourceChip}
								key={`${source.context}:${source.key}`}
							>
								<span className={styles.sourceChipText} title={source.key}>
									{source.key}
								</span>
							</Badge>
						))}
						{remainingSources > 0 && (
							<span className={cx(styles.sourceMore, styles.muted)}>
								+{remainingSources} more
							</span>
						)}
					</div>
				)}
			</td>
			<td className={cx(styles.cell, styles.actionsCell)}>
				<div className={styles.rowActions}>
					<Switch
						value={mapper.enabled}
						onChange={(checked): void => onToggle(mapper.localId, checked)}
						testId={`mapper-enabled-${mapper.localId}`}
					/>
					<MapperActionsMenu mapper={mapper} onEdit={onEdit} onRemove={onRemove} />
				</div>
			</td>
		</motion.tr>
	);
}

export default MapperRow;
