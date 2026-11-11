import { TelemetryFieldKey } from 'api/v5/v5';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { buildCompositeKey } from 'container/OptionsMenu/utils';

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
		accessorFn: (row): unknown => row[name],
		enableMove: !isTimestamp,
		enableRemove: !isTimestamp,
		canBeHidden: !isTimestamp,
		width: { min: 192 },
		cell: ({ value }): JSX.Element => <FieldCell name={name} value={value} />,
	};
}
