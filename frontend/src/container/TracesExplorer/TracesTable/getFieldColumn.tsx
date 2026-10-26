import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { getSpanAttribute } from 'pages/TraceDetailsV3/utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { TIMESTAMP_FIELD_NAMES } from './constants';
import FieldCell from './FieldCell';

export type TracesTableRow = { id: string } & Record<string, unknown>;

export function getFieldColumn(
	field: TelemetryFieldKey,
): TableColumnDef<TracesTableRow> {
	const { name, fieldContext, fieldDataType } = field;
	const isTimestamp = TIMESTAMP_FIELD_NAMES.has(name);

	return {
		id: buildCompositeKey(name, fieldContext, fieldDataType),
		header: name,
		// Span rows nest attribute/resource fields in maps; trace rows are flat.
		accessorFn: (row): unknown =>
			row[name] ??
			getSpanAttribute(
				row as Partial<Pick<SpanV3, 'resource' | 'attributes'>>,
				name,
			),
		enableMove: !isTimestamp,
		enableRemove: !isTimestamp,
		canBeHidden: !isTimestamp,
		width: { min: 192 },
		cell: ({ value }): JSX.Element => <FieldCell name={name} value={value} />,
	};
}
