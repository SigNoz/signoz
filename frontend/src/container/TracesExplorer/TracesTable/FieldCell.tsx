import { Badge } from '@signozhq/ui/badge';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { useTimezone } from 'providers/Timezone';

import {
	DURATION_FIELD_NAMES,
	STATUS_FIELD_NAMES,
	TIMESTAMP_FIELD_NAMES,
} from './constants';
import { stringifyCellValue } from './utils';

type FieldCellProps = {
	name: string;
	value: unknown;
};

function FieldCell({ name, value }: FieldCellProps): JSX.Element {
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	if (TIMESTAMP_FIELD_NAMES.has(name)) {
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

	if (value === '' || value == null) {
		return <TanStackTable.Text data-testid={name}>-</TanStackTable.Text>;
	}

	const text = stringifyCellValue(value);

	if (STATUS_FIELD_NAMES.has(name)) {
		return (
			<Badge data-testid={name} color="sakura" variant="outline">
				{text}
			</Badge>
		);
	}

	if (DURATION_FIELD_NAMES.has(name)) {
		return (
			<TanStackTable.Text data-testid={name}>{getMs(text)}ms</TanStackTable.Text>
		);
	}

	return (
		<TanStackTable.Text data-testid={name} title={text}>
			{text}
		</TanStackTable.Text>
	);
}

export default FieldCell;
