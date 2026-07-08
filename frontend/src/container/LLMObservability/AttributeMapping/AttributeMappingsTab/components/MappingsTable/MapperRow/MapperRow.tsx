import { Badge } from '@signozhq/ui/badge';
import { Switch } from '@signozhq/ui/switch';
import { Typography } from '@signozhq/ui/typography';
import { SpantypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { motion, useReducedMotion } from 'motion/react';

import { DraftMapper } from '../../../../types';
import styles from './MapperRow.module.scss';

const MAX_VISIBLE_SOURCES = 3;

// Rows mount when their group's Collapse panel opens, so this entrance runs
// alongside antd's height animation as the expand reveal. A small per-row
// stagger, capped so a long group doesn't cascade for too long. Collapse
// (unmount + antd's height animation) needs no per-row exit.
const ROW_TRANSITION = { duration: 0.18, ease: 'easeOut' } as const;
const MAX_STAGGERED_ROWS = 6;
const STAGGER_STEP = 0.03;

interface MapperRowProps {
	mapper: DraftMapper;
	// Position within the group, used to stagger the expand reveal.
	index: number;
}

// A single mapper row, aligned to the table's shared columns (Target / Sources /
// Writes to / Status). Priority order is positional — top wins — so there's no
// sortable affordance here. The status switch is read-only in this PR (editing
// lands later); it reflects enabled state without accepting flips.
function MapperRow({ mapper, index }: MapperRowProps): JSX.Element {
	const prefersReducedMotion = useReducedMotion();
	const sources = mapper.sources ?? [];
	const visibleSources = sources.slice(0, MAX_VISIBLE_SOURCES);
	const remainingSources = sources.length - visibleSources.length;

	return (
		<motion.tr
			className={styles.mapperRow}
			data-testid={`mapper-row-${mapper.localId}`}
			initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
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
					data-testid={`mapper-target-${mapper.localId}`}
				>
					{mapper.name}
				</Typography.Text>
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
						testId={`mapper-enabled-${mapper.localId}`}
					/>
				</div>
			</td>
		</motion.tr>
	);
}

export default MapperRow;
