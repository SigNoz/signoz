import { useMemo } from 'react';
import { Badge } from '@signozhq/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@signozhq/ui/table';
import { useListSpanMappers } from 'api/generated/services/spanmapper';

import IndexBadge from './IndexBadge';
import { DraftGroup, DraftMapper, FieldContext, Mapper } from './types';
import { buildDraftMapper } from './utils';

const MAX_VISIBLE_SOURCES = 3;
const COLUMN_COUNT = 5;

interface MappersTableProps {
	group: DraftGroup;
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

function MapperRow({
	mapper,
	index,
}: {
	mapper: DraftMapper;
	index: number;
}): JSX.Element {
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
				<Badge color={mapper.enabled ? 'forest' : 'vanilla'} variant="outline">
					{mapper.enabled ? 'Enabled' : 'Disabled'}
				</Badge>
			</TableCell>
		</TableRow>
	);
}

function MappersTable({ group }: MappersTableProps): JSX.Element {
	// This component only mounts when its group row is expanded, so the fetch is
	// lazy by construction — a group's mappers load on first open and are then
	// cached by react-query. New (unsaved) groups have no serverId, so skip.
	const { data, isLoading, isError } = useListSpanMappers(
		{ groupId: group.serverId ?? '' },
		{ query: { enabled: group.serverId !== null } },
	);

	const mappers = useMemo<DraftMapper[]>(() => {
		// The generated schema mis-types this list response with the groups DTO;
		// the runtime payload is mappers.
		const items = (data?.data?.items ?? []) as unknown as Mapper[];
		return items.map(buildDraftMapper);
	}, [data]);

	return (
		<div className="mappers-table__wrapper">
			<Table testId={`mappers-table-${group.localId}`} className="am-table">
				<TableHeader>
					<TableRow>
						<TableHead>#</TableHead>
						<TableHead>Target</TableHead>
						<TableHead>Sources</TableHead>
						<TableHead>Writes to</TableHead>
						<TableHead>Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								Loading mappings…
							</TableCell>
						</TableRow>
					)}
					{!isLoading && isError && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								Failed to load mappings. Please try again.
							</TableCell>
						</TableRow>
					)}
					{!isLoading && !isError && mappers.length === 0 && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								No mappings in this group yet.
							</TableCell>
						</TableRow>
					)}
					{!isLoading &&
						!isError &&
						mappers.map((mapper, index) => (
							<MapperRow key={mapper.localId} mapper={mapper} index={index} />
						))}
				</TableBody>
			</Table>
		</div>
	);
}

export default MappersTable;
