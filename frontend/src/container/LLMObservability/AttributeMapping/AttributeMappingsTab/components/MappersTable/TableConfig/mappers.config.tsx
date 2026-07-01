import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import type { TableColumnDef } from 'components/TanStackTableView';
import cx from 'classnames';

import { DraftMapper, FieldContext } from '../../../../types';
import styles from './tableConfig.module.scss';

const MAX_VISIBLE_SOURCES = 3;

// Column definitions for the per-group mappers TanStackTable (rendered inside an
// expanded group row). Sorting is off — priority order is positional (top wins)
// and surfaced by the leading index column.
export function getMappersColumns(): TableColumnDef<DraftMapper>[] {
	return [
		{
			id: 'target',
			header: 'Target',
			accessorFn: (row): string => row.name,
			width: { min: 200, default: '100%' },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Typography.Text
					weight="semibold"
					className={styles.mappersTableTarget}
					data-testid={`mapper-target-${row.localId}`}
				>
					{row.name}
				</Typography.Text>
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
			id: 'status',
			header: 'Status',
			// Opt the trailing column out of the "last column fills 100%" rule so the
			// spare width flows into Target / Sources instead of leaving a large empty
			// Status column on the right.
			width: { min: 120, ignoreLastColumnFill: true },
			enableMove: false,
			cell: ({ row }): JSX.Element => (
				<Badge color={row.enabled ? 'forest' : 'vanilla'} variant="outline">
					{row.enabled ? 'Enabled' : 'Disabled'}
				</Badge>
			),
		},
	];
}
