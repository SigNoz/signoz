import { useCallback, useEffect } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
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
import Spinner from 'components/Spinner';

import IndexBadge from './IndexBadge';
import MapperFormDrawer from './MapperFormDrawer';
import { DraftGroup, DraftMapper, FieldContext, Mapper } from './types';
import { AttributeMappingStore } from './useAttributeMappingStore';
import { useMapperFormDrawer } from './useMapperFormDrawer';

const MAX_VISIBLE_SOURCES = 3;
const COLUMN_COUNT = 5;

interface MappersTableProps {
	group: DraftGroup;
	store: AttributeMappingStore;
}

function SourcesCell({ mapper }: { mapper: DraftMapper }): JSX.Element {
	if (mapper.sources.length === 0) {
		return <span className="muted">—</span>;
	}

	const visible = mapper.sources.slice(0, MAX_VISIBLE_SOURCES);
	const remaining = mapper.sources.length - visible.length;

	return (
		<div
			className="mappers-table__sources"
			data-testid={`mapper-sources-${mapper.localId}`}
		>
			{visible.map((source) => (
				<span
					className="mappers-table__source-chip"
					key={`${source.context}:${source.key}`}
					title={source.key}
				>
					{source.key}
				</span>
			))}
			{remaining > 0 && (
				<span className="mappers-table__source-more muted">+{remaining} more</span>
			)}
		</div>
	);
}

interface MapperRowProps {
	mapper: DraftMapper;
	index: number;
	onEdit: (mapper: DraftMapper) => void;
	onDelete: (mapperLocalId: string) => void;
	onToggle: (mapperLocalId: string, enabled: boolean) => void;
}

function MapperRow({
	mapper,
	index,
	onEdit,
	onDelete,
	onToggle,
}: MapperRowProps): JSX.Element {
	return (
		<TableRow data-testid={`mapper-row-${mapper.localId}`}>
			<TableCell>
				<IndexBadge index={index} />
			</TableCell>
			<TableCell>
				<span
					className="mappers-table__target"
					data-testid={`mapper-target-${mapper.localId}`}
				>
					{mapper.name}
				</span>
			</TableCell>
			<TableCell>
				<SourcesCell mapper={mapper} />
			</TableCell>
			<TableCell>
				<Badge
					color={mapper.fieldContext === FieldContext.resource ? 'amber' : 'robin'}
					variant="outline"
				>
					{mapper.fieldContext}
				</Badge>
			</TableCell>
			<TableCell>
				<div className="am-row-actions">
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						aria-label="Edit mapping"
						onClick={(): void => onEdit(mapper)}
						testId={`mapper-edit-${mapper.localId}`}
					>
						<Pencil size={14} />
					</Button>
					<Button
						variant="ghost"
						color="destructive"
						size="icon"
						aria-label="Delete mapping"
						onClick={(): void => onDelete(mapper.localId)}
						testId={`mapper-delete-${mapper.localId}`}
					>
						<Trash2 size={14} />
					</Button>
					<Switch
						value={mapper.enabled}
						onChange={(checked): void => onToggle(mapper.localId, checked)}
						testId={`mapper-enabled-${mapper.localId}`}
					/>
				</div>
			</TableCell>
		</TableRow>
	);
}

function MappersTable({ group, store }: MappersTableProps): JSX.Element {
	const drawer = useMapperFormDrawer();
	const { hydrateGroupMappers } = store;

	// Lazy: this component only mounts when its group row is expanded, so a
	// group's mappers are fetched on first open and then cached by react-query.
	// New (unsaved) groups have no serverId, so skip the fetch. On success the
	// result is folded into the store's draft tree so it's editable.
	const hasServerId = group.serverId !== null;
	const { data, isLoading, isError } = useListSpanMappers(
		{ groupId: group.serverId ?? '' },
		{ query: { enabled: hasServerId } },
	);

	useEffect(() => {
		const items = data?.data?.items;
		if (group.serverId && items) {
			hydrateGroupMappers(group.serverId, items as unknown as Mapper[]);
		}
	}, [group.serverId, data, hydrateGroupMappers]);

	const isLoadingMappers = hasServerId && isLoading;
	const isErrorMappers = hasServerId && isError;

	const handleSave = useCallback((): void => {
		store.upsertMapper(group.localId, drawer.draft);
		drawer.close();
	}, [store, group.localId, drawer]);

	const handleDelete = useCallback((): void => {
		if (drawer.draft.id) {
			store.removeMapper(group.localId, drawer.draft.id);
		}
		drawer.close();
	}, [store, group.localId, drawer]);

	return (
		<div className="mappers-table__wrapper">
			<Table testId={`mappers-table-${group.localId}`} className="am-table">
				<TableHeader>
					<TableRow>
						<TableHead>#</TableHead>
						<TableHead>Target</TableHead>
						<TableHead>Sources</TableHead>
						<TableHead>Writes to</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoadingMappers && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								<Spinner size="small" height="auto" />
							</TableCell>
						</TableRow>
					)}
					{isErrorMappers && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								Failed to load mappings. Please try again.
							</TableCell>
						</TableRow>
					)}
					{!isLoadingMappers && !isErrorMappers && group.mappers.length === 0 && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								No mappings in this group yet.
							</TableCell>
						</TableRow>
					)}
					{!isLoadingMappers &&
						!isErrorMappers &&
						group.mappers.map((mapper, index) => (
							<MapperRow
								key={mapper.localId}
								mapper={mapper}
								index={index}
								onEdit={drawer.openForEdit}
								onDelete={(localId): void => store.removeMapper(group.localId, localId)}
								onToggle={(localId, enabled): void =>
									store.toggleMapper(group.localId, localId, enabled)
								}
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
				testId={`add-mapper-${group.localId}`}
			>
				Add mapping
			</Button>

			<MapperFormDrawer
				isOpen={drawer.isOpen}
				mode={drawer.mode}
				draft={drawer.draft}
				setDraft={drawer.setDraft}
				onClose={drawer.close}
				onSave={handleSave}
				onDelete={handleDelete}
				isSaving={false}
				isDeleting={false}
				saveError={null}
			/>
		</div>
	);
}

export default MappersTable;
