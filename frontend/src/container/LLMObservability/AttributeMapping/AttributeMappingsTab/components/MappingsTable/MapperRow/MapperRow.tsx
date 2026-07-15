import { Badge } from '@signozhq/ui/badge';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import { SpantypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { motion } from 'motion/react';

import { Mapping } from 'container/LLMObservability/AttributeMapping/types';
import styles from './MapperRow.module.scss';

const MAX_VISIBLE_SOURCES = 3;

const ROW_TRANSITION = { duration: 0.18, ease: 'easeOut' } as const;
const MAX_STAGGERED_ROWS = 6;
const STAGGER_STEP = 0.03;

interface MapperRowProps {
	mapper: Mapping;
	index: number;
}

function MapperRow({ mapper, index }: MapperRowProps): JSX.Element {
	const sources = mapper.sources ?? [];
	const visibleSources = sources.slice(0, MAX_VISIBLE_SOURCES);
	const remainingSources = sources.length - visibleSources.length;

	return (
		<motion.tr
			className={styles.mapperRow}
			data-testid={`mapper-row-${mapper.id}`}
			initial={{ opacity: 0, y: -4 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				...ROW_TRANSITION,
				delay: Math.min(index, MAX_STAGGERED_ROWS) * STAGGER_STEP,
			}}
		>
			<td className={cx(styles.cell, styles.targetCell)}>
				<Typography.Text
					truncate={1}
					title={mapper.name}
					data-testid={`mapper-target-${mapper.id}`}
				>
					{mapper.name}
				</Typography.Text>
			</td>
			<td className={styles.cell}>
				{sources.length === 0 ? (
					<span className={styles.muted} data-testid={`mapper-sources-${mapper.id}`}>
						—
					</span>
				) : (
					<div
						className={styles.sources}
						data-testid={`mapper-sources-${mapper.id}`}
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
			<td className={styles.cell}>
				<Badge
					color={
						mapper.fieldContext === SpantypesFieldContextDTO.resource
							? 'amber'
							: 'robin'
					}
					variant="outline"
				>
					{mapper.fieldContext}
				</Badge>
			</td>
			<td className={cx(styles.cell, styles.statusCell)}>
				<div className={styles.rowActions}>
					<Switch
						value={mapper.enabled}
						disabled
						testId={`mapper-enabled-${mapper.id}`}
					/>
				</div>
			</td>
		</motion.tr>
	);
}

export default MapperRow;
