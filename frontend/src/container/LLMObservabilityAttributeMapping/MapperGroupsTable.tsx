import { useState } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@signozhq/ui/table';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import MappersTable from './MappersTable';
import { DraftGroup } from './types';
import { AttributeMappingStore } from './useAttributeMappingStore';
import { conditionFiltersFromGroup } from './utils';

const COLUMN_COUNT = 4;

interface MapperGroupsTableProps {
	store: AttributeMappingStore;
}

function FiltersCell({ group }: { group: DraftGroup }): JSX.Element {
	const filters = conditionFiltersFromGroup(group);
	if (filters.length === 0) {
		return <span className="muted">No condition · always runs</span>;
	}

	return (
		<div
			className="groups-table__filters"
			data-testid={`group-filters-${group.localId}`}
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
	group: DraftGroup;
	isExpanded: boolean;
	onToggleExpand: (localId: string) => void;
}

function GroupRow({
	group,
	isExpanded,
	onToggleExpand,
}: GroupRowProps): JSX.Element {
	return (
		<>
			<TableRow data-testid={`group-row-${group.localId}`}>
				<TableCell>
					<div className="groups-table__name-cell">
						<Button
							variant="ghost"
							color="secondary"
							size="icon"
							aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
							onClick={(): void => onToggleExpand(group.localId)}
							testId={`group-expand-${group.localId}`}
						>
							{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</Button>
						<span
							className="groups-table__name"
							data-testid={`group-name-${group.localId}`}
						>
							{group.name}
						</span>
					</div>
				</TableCell>
				<TableCell>
					<FiltersCell group={group} />
				</TableCell>
				<TableCell>
					<Badge color={group.enabled ? 'forest' : 'vanilla'} variant="outline">
						{group.enabled ? 'Enabled' : 'Disabled'}
					</Badge>
				</TableCell>
			</TableRow>
			{isExpanded && (
				<TableRow className="groups-table__sub-row">
					<TableCell colSpan={COLUMN_COUNT}>
						<MappersTable group={group} />
					</TableCell>
				</TableRow>
			)}
		</>
	);
}

function MapperGroupsTable({ store }: MapperGroupsTableProps): JSX.Element {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const toggleExpand = (localId: string): void => {
		setExpandedId((current) => (current === localId ? null : localId));
	};

	return (
		<div className="groups-table__wrapper">
			<Table testId="mapper-groups-table" className="am-table">
				<TableHeader>
					<TableRow>
						<TableHead>Group name</TableHead>
						<TableHead>Filters</TableHead>
						<TableHead>Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{store.isLoading && store.groups.length === 0 && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								Loading groups…
							</TableCell>
						</TableRow>
					)}
					{!store.isLoading && store.groups.length === 0 && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								No mapping groups yet.
							</TableCell>
						</TableRow>
					)}
					{store.groups.map((group) => (
						<GroupRow
							key={group.localId}
							group={group}
							isExpanded={expandedId === group.localId}
							onToggleExpand={toggleExpand}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

export default MapperGroupsTable;
