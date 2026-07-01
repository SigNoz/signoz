import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import type { TableColumnDef } from 'components/TanStackTableView';

import type { DraftGroup } from '../../../../types';
import { conditionFiltersFromGroup } from '../../../../utils';
import styles from './tableConfig.module.scss';

// Column definitions for the mapping-groups TanStackTable. Sorting is off across
// the board — the groups list API returns the full set unordered, so there's no
// server-side ordering to back a sortable header yet.
export function getMapperGroupsColumns(): TableColumnDef<DraftGroup>[] {
	return [
		{
			id: 'name',
			header: 'Group name',
			accessorFn: (row): string => row.name,
			width: { min: 240, default: '100%' },
			enableMove: false,
			enableRemove: false,
			cell: ({ row, isExpanded, toggleExpanded }): JSX.Element => (
				<div className={styles.groupsTableNameCell}>
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
						onClick={(): void => toggleExpanded()}
						testId={`group-expand-${row.localId}`}
					>
						{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
					</Button>
					<span
						className={styles.groupsTableName}
						data-testid={`group-name-${row.localId}`}
					>
						{row.name}
					</span>
				</div>
			),
		},
		{
			id: 'filters',
			header: 'Filters',
			width: { min: 200, default: '100%' },
			enableMove: false,
			cell: ({ row }): JSX.Element => {
				const filters = conditionFiltersFromGroup(row);
				if (filters.length === 0) {
					return <span className={styles.muted}>No condition · always runs</span>;
				}
				return (
					<div
						className={styles.groupsTableFilters}
						data-testid={`group-filters-${row.localId}`}
					>
						{filters.map((filter) => (
							<div
								className={styles.groupsTableFilter}
								key={`${filter.context}:${filter.key}`}
							>
								<Badge
									color={filter.context === 'resource' ? 'amber' : 'robin'}
									variant="outline"
								>
									{filter.context}
								</Badge>
								<span className={styles.groupsTableFilterKey}>
									contains {filter.key}
								</span>
							</div>
						))}
					</div>
				);
			},
		},
		{
			id: 'status',
			header: 'Status',
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
