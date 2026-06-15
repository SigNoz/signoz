import { useMemo, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { ConfirmDialog } from '@signozhq/ui/dialog';
import { Switch } from '@signozhq/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@signozhq/ui/table';
import { Pencil, Plus, Trash2 } from '@signozhq/icons';
import { useListSpanMappers } from 'api/generated/services/spanmapper';

import IndexBadge from './IndexBadge';
import MapperFormDrawer from './MapperFormDrawer';
import { Mapper } from './types';
import { useMapperFormDrawer } from './useMapperFormDrawer';
import { getMapperSourceKeys } from './utils';

const MAX_VISIBLE_SOURCES = 3;
const COLUMN_COUNT = 4;

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

interface MapperRowProps {
	mapper: Mapper;
	index: number;
	onEdit: (mapper: Mapper) => void;
	onRequestDelete: (mapper: Mapper) => void;
	onToggleEnabled: (mapper: Mapper, enabled: boolean) => void;
}

function MapperRow({
	mapper,
	index,
	onEdit,
	onRequestDelete,
	onToggleEnabled,
}: MapperRowProps): JSX.Element {
	return (
		<TableRow data-testid={`mapper-row-${mapper.id}`}>
			<TableCell>
				<IndexBadge index={index} />
			</TableCell>
			<TableCell>
				<span
					className="mappers-table__target"
					data-testid={`mapper-target-${mapper.id}`}
				>
					{mapper.name}
				</span>
			</TableCell>
			<TableCell>
				<SourcesCell mapper={mapper} />
			</TableCell>
			<TableCell>
				<div className="am-row-actions">
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						aria-label="Edit mapping"
						onClick={(): void => onEdit(mapper)}
						testId={`mapper-edit-${mapper.id}`}
					>
						<Pencil size={14} />
					</Button>
					<Button
						variant="ghost"
						color="destructive"
						size="icon"
						aria-label="Delete mapping"
						onClick={(): void => onRequestDelete(mapper)}
						testId={`mapper-delete-${mapper.id}`}
					>
						<Trash2 size={14} />
					</Button>
					<Switch
						value={mapper.enabled}
						onChange={(checked): void => onToggleEnabled(mapper, checked)}
						testId={`mapper-enabled-${mapper.id}`}
					/>
				</div>
			</TableCell>
		</TableRow>
	);
}

function MappersTable({ groupId }: MappersTableProps): JSX.Element {
	const { data, isLoading, isError } = useListSpanMappers({ groupId });
	const drawer = useMapperFormDrawer(groupId);
	const [pendingDelete, setPendingDelete] = useState<Mapper | null>(null);

	// NOTE: the generated client mistypes this response as a list of groups
	// (backend OpenAPI def reuses GettableSpanMapperGroups). The runtime
	// payload is a list of mappers, so we re-assert the element type here.
	const mappers = useMemo(
		() => (data?.data?.items ?? []) as unknown as Mapper[],
		[data],
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
			<Table testId={`mappers-table-${groupId}`} className="am-table">
				<TableHeader>
					<TableRow>
						<TableHead>#</TableHead>
						<TableHead>Target</TableHead>
						<TableHead>Sources</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading && mappers.length === 0 && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								Loading mappings…
							</TableCell>
						</TableRow>
					)}
					{!isLoading && mappers.length === 0 && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								No mappings in this group yet.
							</TableCell>
						</TableRow>
					)}
					{mappers.map((mapper, index) => (
						<MapperRow
							key={mapper.id}
							mapper={mapper}
							index={index}
							onEdit={drawer.openForEdit}
							onRequestDelete={setPendingDelete}
							onToggleEnabled={drawer.toggleEnabled}
						/>
					))}
				</TableBody>
			</Table>

			<Button
				variant="ghost"
				color="primary"
				size="sm"
				prefix={<Plus size={14} />}
				className="am-add-row"
				onClick={drawer.openForAdd}
				testId={`add-mapper-${groupId}`}
			>
				Add mapping
			</Button>

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

			<ConfirmDialog
				open={pendingDelete !== null}
				onOpenChange={(open): void => {
					if (!open) {
						setPendingDelete(null);
					}
				}}
				title="Delete mapping?"
				confirmText="Delete mapping"
				confirmColor="destructive"
				cancelText="Cancel"
				testId={`mapper-delete-confirm-${groupId}`}
				onConfirm={async (): Promise<boolean> => {
					if (pendingDelete) {
						await drawer.removeMapper(pendingDelete.id);
						setPendingDelete(null);
					}
					return true;
				}}
			>
				This removes the <strong>{pendingDelete?.name}</strong> mapping. This
				can&apos;t be undone.
			</ConfirmDialog>
		</div>
	);
}

export default MappersTable;
