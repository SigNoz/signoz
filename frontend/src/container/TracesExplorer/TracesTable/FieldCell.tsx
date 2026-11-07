import { AppLink } from 'lib/router/AppLink';
import { buildRoutePath } from 'lib/router/buildRoutePath';
import { Minus } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import TanStackTable from 'components/TanStackTableView';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import {
	logOpenTraceClicked,
	OpenTraceSource,
} from 'container/TracesExplorer/events';
import { getMs } from 'utils/timeUtils';
import { useTimezone } from 'providers/Timezone';

import {
	DURATION_FIELD_NAMES,
	STATUS_FIELD_NAMES,
	TIMESTAMP_FIELD_NAMES,
	TRACE_ID_FIELD_NAMES,
} from './constants';
import { stringifyCellValue } from './utils';

import styles from './FieldCell.module.scss';

type FieldCellProps = {
	name: string;
	value: unknown;
	panelType: PANEL_TYPES;
};

function FieldCell({ name, value, panelType }: FieldCellProps): JSX.Element {
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
		return (
			<TanStackTable.Text data-testid={name}>
				<Minus size={14} className={styles.emptyValue} data-testid="empty-value" />
			</TanStackTable.Text>
		);
	}

	const text = stringifyCellValue(value);

	if (TRACE_ID_FIELD_NAMES.has(name)) {
		return (
			<AppLink
				to={buildRoutePath(ROUTES.TRACE_DETAIL, { id: text })}
				data-testid="trace-id"
				onClick={(e): void => {
					e.stopPropagation();
					logOpenTraceClicked(panelType, OpenTraceSource.TraceId);
				}}
				onAuxClick={(e): void => {
					if (e.button === 1) {
						logOpenTraceClicked(panelType, OpenTraceSource.TraceId);
					}
				}}
			>
				{text}
			</AppLink>
		);
	}

	if (STATUS_FIELD_NAMES.has(name)) {
		return (
			<Badge
				textTransform="none"
				testId={name}
				color="highlight-danger"
				variant="outlined"
			>
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
