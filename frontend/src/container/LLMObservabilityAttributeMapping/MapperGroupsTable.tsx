import { useState } from 'react';
import { Badge } from '@signozhq/ui/badge';
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
import {
	ChevronDown,
	ChevronRight,
	Pencil,
	Plus,
	Trash2,
} from '@signozhq/icons';

import IndexBadge from './IndexBadge';
import MappersTable from './MappersTable';
import { MapperGroup } from './types';
import { formatTimestamp, getConditionFilters } from './utils';

const COLUMN_COUNT = 6;

interface MapperGroupsTableProps {
	groups: MapperGroup[];
	isLoading: boolean;
	onEdit: (group: MapperGroup) => void;
	onAdd: () => void;
	onDelete: (groupId: string) => Promise<void>;
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

interface GroupRowProps {
	group: MapperGroup;
	index: number;
	isExpanded: boolean;
	onToggleExpand: (groupId: string) => void;
	onEdit: (group: MapperGroup) => void;
	onRequestDelete: (group: MapperGroup) => void;
	onToggleEnabled: (group: MapperGroup, enabled: boolean) => void;
}

function GroupRow({
	group,
	index,
	isExpanded,
	onToggleExpand,
	onEdit,
	onRequestDelete,
	onToggleEnabled,
}: GroupRowProps): JSX.Element {
	return (
		<>
			<TableRow data-testid={`group-row-${group.id}`}>
				<TableCell className="groups-table__expand-cell">
					<Button
						variant="ghost"
						color="secondary"
						size="icon"
						aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
						onClick={(): void => onToggleExpand(group.id)}
						testId={`group-expand-${group.id}`}
					>
						{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
					</Button>
				</TableCell>
				<TableCell>
					<IndexBadge index={index} />
				</TableCell>
				<TableCell>
					<span
						className="groups-table__name"
						data-testid={`group-name-${group.id}`}
					>
						{group.name}
					</span>
				</TableCell>
				<TableCell>
					<FiltersCell group={group} />
				</TableCell>
				<TableCell>
					<div className="groups-table__edited">
						<span>{formatTimestamp(group.updatedAt)}</span>
						{group.updatedBy && <span className="muted">{group.updatedBy}</span>}
					</div>
				</TableCell>
				<TableCell>
					<div className="am-row-actions">
						<Button
							variant="ghost"
							color="secondary"
							size="icon"
							aria-label="Edit group"
							onClick={(): void => onEdit(group)}
							testId={`group-edit-${group.id}`}
						>
							<Pencil size={14} />
						</Button>
						<Button
							variant="ghost"
							color="destructive"
							size="icon"
							aria-label="Delete group"
							onClick={(): void => onRequestDelete(group)}
							testId={`group-delete-${group.id}`}
						>
							<Trash2 size={14} />
						</Button>
						<Switch
							value={group.enabled}
							onChange={(checked): void => onToggleEnabled(group, checked)}
							testId={`group-enabled-${group.id}`}
						/>
					</div>
				</TableCell>
			</TableRow>
			{isExpanded && (
				<TableRow className="groups-table__sub-row">
					<TableCell colSpan={COLUMN_COUNT}>
						<MappersTable groupId={group.id} />
					</TableCell>
				</TableRow>
			)}
		</>
	);
}

function MapperGroupsTable({
	groups,
	isLoading,
	onEdit,
	onAdd,
	onDelete,
	onToggleEnabled,
}: MapperGroupsTableProps): JSX.Element {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [pendingDelete, setPendingDelete] = useState<MapperGroup | null>(null);

	const toggleExpand = (groupId: string): void => {
		setExpandedId((current) => (current === groupId ? null : groupId));
	};

	return (
		<div className="groups-table__wrapper">
			<Table testId="mapper-groups-table" className="am-table">
				<TableHeader>
					<TableRow>
						<TableHead aria-label="Expand" />
						<TableHead>#</TableHead>
						<TableHead>Group name</TableHead>
						<TableHead>Filters</TableHead>
						<TableHead>Last edited</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading && groups.length === 0 && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								Loading groups…
							</TableCell>
						</TableRow>
					)}
					{!isLoading && groups.length === 0 && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								No mapping groups yet.
							</TableCell>
						</TableRow>
					)}
					{groups.map((group, index) => (
						<GroupRow
							key={group.id}
							group={group}
							index={index}
							isExpanded={expandedId === group.id}
							onToggleExpand={toggleExpand}
							onEdit={onEdit}
							onRequestDelete={setPendingDelete}
							onToggleEnabled={onToggleEnabled}
						/>
					))}
				</TableBody>
			</Table>

			<Button
				variant="ghost"
				color="primary"
				prefix={<Plus size={14} />}
				className="am-add-row"
				onClick={onAdd}
				testId="add-group-row"
			>
				Add a new group
			</Button>

			<ConfirmDialog
				open={pendingDelete !== null}
				onOpenChange={(open): void => {
					if (!open) {
						setPendingDelete(null);
					}
				}}
				title="Delete group?"
				confirmText="Delete group"
				confirmColor="destructive"
				cancelText="Cancel"
				testId="group-delete-confirm"
				onConfirm={async (): Promise<boolean> => {
					if (pendingDelete) {
						await onDelete(pendingDelete.id);
						setPendingDelete(null);
					}
					return true;
				}}
			>
				Deleting <strong>{pendingDelete?.name}</strong> also removes all of its
				attribute mappings. This can&apos;t be undone.
			</ConfirmDialog>
		</div>
	);
}

export default MapperGroupsTable;
