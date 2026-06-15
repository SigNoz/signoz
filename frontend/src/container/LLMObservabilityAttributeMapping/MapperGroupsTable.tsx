import { useMemo } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Switch } from '@signozhq/ui/switch';
import { type ColumnDef, DataTable } from '@signozhq/ui/table';

import MappersTable from './MappersTable';
import { MapperGroup } from './types';
import { formatTimestamp, getConditionFilters } from './utils';

interface MapperGroupsTableProps {
	groups: MapperGroup[];
	isLoading: boolean;
	onEdit: (group: MapperGroup) => void;
	onToggleEnabled: (group: MapperGroup, enabled: boolean) => void;
}

function FiltersCell({ group }: { group: MapperGroup }): JSX.Element {
	const filters = getConditionFilters(group);
	if (filters.length === 0) {
		return <span className="muted">No condition · always runs</span>;
	}

	return (
		<div
			className="groups-table__filters"
			data-testid={`group-filters-${group.id}`}
		>
			{filters.map((filter) => (
				<div
					className="groups-table__filter"
					key={`${filter.context}:${filter.key}`}
				>
					<Badge
						color={filter.context === 'resource' ? 'amber' : 'robin'}
						variant="outline"
					>
						{filter.context}
					</Badge>
					<span className="groups-table__filter-key">contains {filter.key}</span>
				</div>
			))}
		</div>
	);
}

function buildColumns(
	onEdit: (group: MapperGroup) => void,
	onToggleEnabled: (group: MapperGroup, enabled: boolean) => void,
): ColumnDef<MapperGroup>[] {
	return [
		{
			id: 'name',
			header: 'Group name',
			accessorKey: 'name',
			cell: ({ row }): JSX.Element => (
				<span
					className="groups-table__name"
					data-testid={`group-name-${row.original.id}`}
				>
					{row.original.name}
				</span>
			),
		},
		{
			id: 'filters',
			header: 'Filters',
			cell: ({ row }): JSX.Element => <FiltersCell group={row.original} />,
		},
		{
			id: 'enabled',
			header: 'Active',
			size: 90,
			cell: ({ row }): JSX.Element => (
				<Switch
					value={row.original.enabled}
					onChange={(checked): void => onToggleEnabled(row.original, checked)}
					testId={`group-enabled-${row.original.id}`}
				/>
			),
		},
		{
			id: 'updatedAt',
			header: 'Last edited',
			size: 220,
			cell: ({ row }): JSX.Element => (
				<div className="groups-table__edited">
					<span>{formatTimestamp(row.original.updatedAt)}</span>
					{row.original.updatedBy && (
						<span className="muted">{row.original.updatedBy}</span>
					)}
				</div>
			),
		},
		{
			id: 'actions',
			header: '',
			size: 80,
			cell: ({ row }): JSX.Element => (
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					onClick={(): void => onEdit(row.original)}
					testId={`group-edit-${row.original.id}`}
				>
					Edit
				</Button>
			),
		},
	];
}

function MapperGroupsTable({
	groups,
	isLoading,
	onEdit,
	onToggleEnabled,
}: MapperGroupsTableProps): JSX.Element {
	const columns = useMemo(
		() => buildColumns(onEdit, onToggleEnabled),
		[onEdit, onToggleEnabled],
	);

	return (
		<DataTable<MapperGroup, unknown>
			tableId="mapper-groups-table"
			columns={columns}
			data={groups}
			isLoading={isLoading}
			enableRowExpansion
			getRowCanExpand={(): boolean => true}
			renderSubComponent={({ row }): JSX.Element => (
				<MappersTable groupId={row.original.id} />
			)}
			testId="mapper-groups-table"
		/>
	);
}

export default MapperGroupsTable;
