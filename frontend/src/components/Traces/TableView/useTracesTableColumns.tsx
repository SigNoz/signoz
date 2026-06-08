import { useMemo, type ReactElement } from 'react';

import TanStackTable from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import type { TelemetryFieldKey } from 'types/api/v5/queryRange';

type UseTracesTableColumnsProps<TRow> = {
	/** Pinned / always-on columns owned by the consumer (e.g. timestamp for List view, the 5 static columns for Traces grouped view). */
	baseColumns: TableColumnDef<TRow>[];
	/** Dynamic columns sourced from `selectColumns` (List view). Omit or pass [] for views without a picker (Traces grouped). */
	fields?: TelemetryFieldKey[];
};

/**
 * Shared column builder for the trace list view and the trace (group-by-trace) view.
 *
 * Composition: `[...baseColumns, ...fields.map(makeUserFieldCol)]`. Each view owns its
 * `baseColumns` inline so view-specific changes (timestamp formatting on list, static-column
 * cell renderers on grouped) stay localized. The shared piece is `makeUserFieldCol` — the
 * dynamic-field factory that consumes `selectColumns` for the list view.
 */
export function useTracesTableColumns<TRow>({
	baseColumns,
	fields = [],
}: UseTracesTableColumnsProps<TRow>): TableColumnDef<TRow>[] {
	return useMemo<TableColumnDef<TRow>[]>(
		() => [...baseColumns, ...fields.map((f) => makeUserFieldCol<TRow>(f))],
		[baseColumns, fields],
	);
}

function makeUserFieldCol<TRow>(f: TelemetryFieldKey): TableColumnDef<TRow> {
	const col: TableColumnDef<Record<string, unknown>> = {
		id: buildCompositeKey(f.name, f.fieldContext, f.fieldDataType),
		header: f.name,
		accessorFn: (row): unknown => row[f.name],
		enableRemove: true,
		width: { min: 192 },
		cell: ({ value }): ReactElement => (
			<TanStackTable.Text>{stringifyCellValue(value)}</TanStackTable.Text>
		),
	};
	return col as TableColumnDef<TRow>;
}

function stringifyCellValue(value: unknown): string {
	if (value == null) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return JSON.stringify(value);
}
