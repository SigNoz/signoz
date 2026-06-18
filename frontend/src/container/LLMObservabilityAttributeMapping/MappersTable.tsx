import { Badge } from '@signozhq/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@signozhq/ui/table';

import IndexBadge from './IndexBadge';
import { DraftGroup, DraftMapper, FieldContext } from './types';

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
					{group.mappers.length === 0 && (
						<TableRow>
							<TableCell colSpan={COLUMN_COUNT} className="am-table__empty">
								No mappings in this group yet.
							</TableCell>
						</TableRow>
					)}
					{group.mappers.map((mapper, index) => (
						<MapperRow key={mapper.localId} mapper={mapper} index={index} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}

export default MappersTable;
