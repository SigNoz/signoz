import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Switch } from '@signozhq/ui/switch';
import { Pencil, Trash2 } from '@signozhq/icons';
import type { TableColumnDef } from 'components/TanStackTableView';
import cx from 'classnames';

import styles from './LLMObservabilityAttributeMapping.module.scss';
import { DraftMapper, FieldContext } from './types';

const MAX_VISIBLE_SOURCES = 3;

interface ColumnsConfig {
	onEdit: (mapper: DraftMapper) => void;
	onRemove: (localId: string) => void;
	onToggle: (localId: string, enabled: boolean) => void;
}

// Column definitions for the per-group mappers TanStackTable (rendered inside an
// expanded group row). Sorting is off — priority order is positional (top wins).
export function getMappersColumns({
	onEdit,
	onRemove,
	onToggle,
}: ColumnsConfig): TableColumnDef<DraftMapper>[] {
	return [
		{
			id: 'target',
			header: 'Target',
			accessorFn: (row): string => row.name,
			width: { min: 200, default: '100%' },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<span
					className={styles.mappersTableTarget}
					data-testid={`mapper-target-${row.localId}`}
				>
					{row.name}
				</span>
			),
		},
		{
			id: 'sources',
			header: 'Sources',
			width: { min: 220, default: '100%' },
			enableMove: false,
			cell: ({ row }): JSX.Element => {
				// Skeleton placeholder rows reach the cell before real data, so
				// `sources` can be undefined — default to empty.
				const sources = row.sources ?? [];
				if (sources.length === 0) {
					return <span className={styles.muted}>—</span>;
				}
				const visible = sources.slice(0, MAX_VISIBLE_SOURCES);
				const remaining = sources.length - visible.length;
				return (
					<div
						className={styles.mappersTableSources}
						data-testid={`mapper-sources-${row.localId}`}
					>
						{visible.map((source) => (
							<span
								className={styles.mappersTableSourceChip}
								key={`${source.context}:${source.key}`}
								title={source.key}
							>
								{source.key}
							</span>
						))}
						{remaining > 0 && (
							<span className={cx(styles.mappersTableSourceMore, styles.muted)}>
								+{remaining} more
							</span>
						)}
					</div>
				);
			},
		},
		{
			id: 'writesTo',
			header: 'Writes to',
			width: { min: 130 },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Badge
					color={row.fieldContext === FieldContext.resource ? 'amber' : 'robin'}
					variant="outline"
				>
					{row.fieldContext}
				</Badge>
			),
		},
		{
			id: 'actions',
			header: 'Actions',
			// Compact, right-aligned action cluster — opt out of the "last column
			// fills 100%" rule so the spare width flows into Target / Sources.
			width: { fixed: '160px', ignoreLastColumnFill: true },
			enableMove: false,
			enableRemove: false,
			cell: ({ row }): JSX.Element => (
				<div className={styles.rowActions}>
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						aria-label="Edit mapping"
						onClick={(): void => onEdit(row)}
						testId={`mapper-edit-${row.localId}`}
					>
						<Pencil size={14} />
					</Button>
					<Button
						variant="ghost"
						color="destructive"
						size="icon"
						aria-label="Delete mapping"
						onClick={(): void => onRemove(row.localId)}
						testId={`mapper-delete-${row.localId}`}
					>
						<Trash2 size={14} />
					</Button>
					<Switch
						value={row.enabled}
						onChange={(checked): void => onToggle(row.localId, checked)}
						testId={`mapper-enabled-${row.localId}`}
					/>
				</div>
			),
		},
	];
}
