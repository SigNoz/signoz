import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CustomTimePicker from 'components/CustomTimePicker/CustomTimePicker';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import type { DateTimeRangeType } from 'container/TopNav/CustomDateTimeModal';
import { getOptions } from 'container/TopNav/DateTimeSelectionV2/constants';
import type {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import dayjs from 'dayjs';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { useTimezone } from 'providers/Timezone';

const MS_TO_NS = 1e6;

export interface PreviewTime {
	/** Relative shorthand (e.g. `30m`) or `custom`. */
	interval: Time | CustomTimeType;
	/** Custom range `[startSec, endSec]`; null for relative. */
	range: [number, number] | null;
}

interface PreviewTimePickerProps {
	value: PreviewTime;
	onChange: (next: PreviewTime) => void;
}

/**
 * Time picker for the panel editor preview. Wraps the shared `CustomTimePicker`
 * with fully-local state — it never reads or writes global Redux time or the
 * URL, so changing the preview window doesn't touch (or re-run) the dashboard
 * behind the editor overlay. Selections are emitted via `onChange`; the parent
 * feeds them to the preview fetch.
 */
function PreviewTimePicker({
	value,
	onChange,
}: PreviewTimePickerProps): JSX.Element {
	const { pathname } = useLocation();
	const { timezone } = useTimezone();
	const [open, setOpen] = useState<boolean>(false);
	const [customVisible, setCustomVisible] = useState<boolean>(false);

	const { interval, range } = value;
	const options = useMemo(() => getOptions(pathname), [pathname]);

	// Active window in ms — custom uses the picked range; relative is computed
	// now-based (Redux-independent). Drives the relative-duration pill.
	const [startMs, endMs] = useMemo<[number, number]>(() => {
		if (range) {
			return [range[0] * 1000, range[1] * 1000];
		}
		const { start, end } = getStartEndRangeTime({
			type: 'GLOBAL_TIME',
			interval,
		});
		return [Number(start) * 1000, Number(end) * 1000];
	}, [interval, range]);

	// Label shown for a custom range; relative selections render their own
	// "Last …" label from `selectedTime` inside CustomTimePicker.
	const selectedValue = useMemo(() => {
		if (!range) {
			return '';
		}
		const fmt = DATE_TIME_FORMATS.UK_DATETIME_SECONDS;
		const start = dayjs(startMs).tz(timezone.value).format(fmt);
		const end = dayjs(endMs).tz(timezone.value).format(fmt);
		return `${start} - ${end}`;
	}, [range, startMs, endMs, timezone.value]);

	const onSelect = (next: string): void => {
		if (next === 'custom') {
			setCustomVisible(true);
			return;
		}
		setOpen(false);
		onChange({ interval: next as Time, range: null });
	};

	const onCustomDateHandler = (dateTimeRange: DateTimeRangeType): void => {
		if (!dateTimeRange) {
			return;
		}
		const [startMoment, endMoment] = dateTimeRange;
		if (!startMoment || !endMoment) {
			return;
		}
		setCustomVisible(false);
		setOpen(false);
		onChange({
			interval: 'custom',
			range: [
				Math.floor(startMoment.toDate().getTime() / 1000),
				Math.floor(endMoment.toDate().getTime() / 1000),
			],
		});
	};

	return (
		<CustomTimePicker
			newPopover
			open={open}
			setOpen={setOpen}
			items={options}
			selectedTime={interval}
			selectedValue={selectedValue}
			minTime={startMs * MS_TO_NS}
			maxTime={endMs * MS_TO_NS}
			// Hides the zoom-out button — it mutates global time, which the editor
			// must not do.
			isModalTimeSelection
			onSelect={onSelect}
			onError={(): void => {}}
			onCustomDateHandler={onCustomDateHandler}
			customDateTimeVisible={customVisible}
			setCustomDTPickerVisible={setCustomVisible}
			onValidCustomDateChange={({ timeStr }): void => {
				setOpen(false);
				onChange({ interval: timeStr as Time, range: null });
			}}
		/>
	);
}

export default PreviewTimePicker;
