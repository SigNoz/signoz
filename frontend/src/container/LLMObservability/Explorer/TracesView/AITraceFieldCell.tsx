import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import FieldCell from 'container/TracesExplorer/TracesTable/FieldCell';
import { useTimezone } from 'providers/Timezone';

import { DATETIME_FIELD_NAMES, DURATION_FIELD_NAMES } from './fieldFormats';

type AITraceFieldCellProps = {
	name: string;
	value: unknown;
};

/** Formats the per-trace columns the shared cell has no allowlist for, else defers to it. */
function AITraceFieldCell({ name, value }: AITraceFieldCellProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	if (DATETIME_FIELD_NAMES.has(name)) {
		const ts = value as string | number;
		const formatted =
			typeof ts === 'string'
				? formatTimezoneAdjustedTimestamp(ts, DATE_TIME_FORMATS.ISO_DATETIME_MS)
				: formatTimezoneAdjustedTimestamp(
						ts / 1e6,
						DATE_TIME_FORMATS.ISO_DATETIME_MS,
					);
		const text = String(formatted);
		return <TanStackTable.Text title={text}>{text}</TanStackTable.Text>;
	}

	if (DURATION_FIELD_NAMES.has(name) && value !== '' && value != null) {
		return (
			<TanStackTable.Text data-testid={name}>
				{getMs(String(value))}ms
			</TanStackTable.Text>
		);
	}

	return <FieldCell name={name} value={value} />;
}

export default AITraceFieldCell;
