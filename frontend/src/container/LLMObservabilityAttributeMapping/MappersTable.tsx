import { useMemo } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Switch } from '@signozhq/ui/switch';
import { type ColumnDef, DataTable } from '@signozhq/ui/table';
import { Plus } from '@signozhq/icons';
import { useListSpanMappers } from 'api/generated/services/spanmapper';

import MapperFormDrawer from './MapperFormDrawer';
import { FieldContext, Mapper } from './types';
import { useMapperFormDrawer } from './useMapperFormDrawer';
import { getMapperSourceKeys } from './utils';

const MAX_VISIBLE_SOURCES = 3;

interface MappersTableProps {
	groupId: string;
}

function SourcesCell({ mapper }: { mapper: Mapper }): JSX.Element {
	const keys = getMapperSourceKeys(mapper);
	if (keys.length === 0) {
		return <span className="muted">—</span>;
	}

	const visible = keys.slice(0, MAX_VISIBLE_SOURCES);
	const remaining = keys.length - visible.length;

	return (
		<span
			className="mappers-table__sources"
			data-testid={`mapper-sources-${mapper.id}`}
		>
			{visible.join(', ')}
			{remaining > 0 && <span className="muted"> +{remaining} more</span>}
		</span>
	);
}

function buildColumns(
	onEdit: (mapper: Mapper) => void,
	onToggleEnabled: (mapper: Mapper, enabled: boolean) => void,
): ColumnDef<Mapper>[] {
	return [
		{
			id: 'target',
			header: 'Target',
			accessorKey: 'name',
			cell: ({ row }): JSX.Element => (
				<span
					className="mappers-table__target"
					data-testid={`mapper-target-${row.original.id}`}
				>
					{row.original.name}
				</span>
			),
		},
		{
			id: 'sources',
			header: 'Sources',
			cell: ({ row }): JSX.Element => <SourcesCell mapper={row.original} />,
		},
		{
			id: 'fieldContext',
			header: 'Writes to',
			size: 120,
			cell: ({ row }): JSX.Element => (
				<Badge
					color={
						row.original.fieldContext === FieldContext.resource ? 'amber' : 'robin'
					}
					variant="outline"
				>
					{row.original.fieldContext}
				</Badge>
			),
		},
		{
			id: 'enabled',
			header: 'Active',
			size: 80,
			cell: ({ row }): JSX.Element => (
				<Switch
					value={row.original.enabled}
					onChange={(checked): void => onToggleEnabled(row.original, checked)}
					testId={`mapper-enabled-${row.original.id}`}
				/>
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
					testId={`mapper-edit-${row.original.id}`}
				>
					Edit
				</Button>
			),
		},
	];
}

function MappersTable({ groupId }: MappersTableProps): JSX.Element {
	const { data, isLoading, isError } = useListSpanMappers({ groupId });
	const drawer = useMapperFormDrawer(groupId);

	// NOTE: the generated client mistypes this response as a list of groups
	// (backend OpenAPI def reuses GettableSpanMapperGroups). The runtime
	// payload is a list of mappers, so we re-assert the element type here.
	const mappers = useMemo(
		() => (data?.data?.items ?? []) as unknown as Mapper[],
		[data],
	);

	const columns = useMemo(
		() => buildColumns(drawer.openForEdit, drawer.toggleEnabled),
		[drawer.openForEdit, drawer.toggleEnabled],
	);

	if (isError) {
		return (
			<div className="mappers-table__error" role="alert">
				Failed to load attribute mappings for this group.
			</div>
		);
	}

	return (
		<div className="mappers-table__wrapper">
			<div className="mappers-table__toolbar">
				<Button
					variant="dashed"
					color="secondary"
					size="sm"
					prefix={<Plus size={14} />}
					onClick={drawer.openForAdd}
					testId={`add-mapper-${groupId}`}
				>
					Add mapping
				</Button>
			</div>

			<DataTable<Mapper, unknown>
				tableId={`mappers-table-${groupId}`}
				columns={columns}
				data={mappers}
				isLoading={isLoading}
				testId={`mappers-table-${groupId}`}
			/>

			<MapperFormDrawer
				isOpen={drawer.isOpen}
				mode={drawer.mode}
				draft={drawer.draft}
				setDraft={drawer.setDraft}
				onClose={drawer.close}
				onSave={drawer.save}
				onDelete={drawer.deleteMapper}
				isSaving={drawer.isSaving}
				isDeleting={drawer.isDeleting}
				saveError={drawer.saveError}
			/>
		</div>
	);
}

export default MappersTable;
