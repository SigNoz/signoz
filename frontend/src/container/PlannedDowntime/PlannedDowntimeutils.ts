import { NotificationInstance } from 'antd/es/notification/interface';
import { DefaultOptionType } from 'antd/es/select';
import createDowntimeSchedule from 'api/plannedDowntime/createDowntimeSchedule';
import { DeleteSchedulePayloadProps } from 'api/plannedDowntime/deleteDowntimeSchedule';
import {
	DowntimeSchedules,
	Recurrence,
} from 'api/plannedDowntime/getAllDowntimeSchedules';
import updateDowntimeSchedule, {
	DowntimeScheduleUpdatePayload,
	PayloadProps,
} from 'api/plannedDowntime/updateDowntimeSchedule';
import { showErrorNotification } from 'components/ExplorerCard/utils';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { isEmpty, isEqual } from 'lodash-es';
import { UseMutateAsyncFunction } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type DateTimeString = string | null | undefined;

export const getDuration = (
	startTime: DateTimeString,
	endTime: DateTimeString,
): string => {
	if (!startTime || !endTime) {
		return 'N/A';
	}

	const start = dayjs(startTime);
	const end = dayjs(endTime);
	const durationMs = end.diff(start);

	const minutes = Math.floor(durationMs / (1000 * 60));
	const hours = Math.floor(durationMs / (1000 * 60 * 60));

	if (minutes < 60) {
		return `${minutes} min`;
	}
	return `${hours} hours`;
};

export const formatDateTime = (dateTimeString?: string | null): string => {
	if (!dateTimeString) {
		return 'N/A';
	}

	return dayjs(dateTimeString.slice(0, 19)).format(
		DATE_TIME_FORMATS.MONTH_DATETIME,
	);
};

export const getAlertOptionsFromIds = (
	alertIds: string[],
	alertOptions: DefaultOptionType[],
): DefaultOptionType[] =>
	alertOptions.filter(
		(alert) =>
			alert !== undefined &&
			alert.value &&
			alertIds?.includes(alert.value as string),
	);

export const recurrenceInfo = (recurrence?: Recurrence | null): string => {
	if (!recurrence) {
		return 'No';
	}

	const { startTime, duration, repeatOn, repeatType, endTime } = recurrence;

	const formattedStartTime = startTime ? formatDateTime(startTime) : '';
	const formattedEndTime = endTime ? `to ${formatDateTime(endTime)}` : '';
	const weeklyRepeatString = repeatOn ? `on ${repeatOn.join(', ')}` : '';
	const durationString = duration ? `- Duration: ${duration}` : '';

	return `Repeats - ${repeatType} ${weeklyRepeatString} from ${formattedStartTime} ${formattedEndTime} ${durationString}`;
};

export const defautlInitialValues: Partial<
	DowntimeSchedules & { editMode: boolean }
> = {
	name: '',
	description: '',
	schedule: {
		timezone: '',
		endTime: '',
		recurrence: null,
		startTime: '',
	},
	alertIds: [],
	createdAt: '',
	createdBy: '',
	editMode: false,
};

type DeleteDowntimeScheduleProps = {
	deleteDowntimeScheduleAsync: UseMutateAsyncFunction<
		DeleteSchedulePayloadProps,
		Error,
		number
	>;
	notifications: NotificationInstance;
	refetchAllSchedules: VoidFunction;
	deleteId?: number;
	hideDeleteDowntimeScheduleModal: () => void;
	clearSearch: () => void;
};

export const deleteDowntimeHandler = ({
	deleteDowntimeScheduleAsync,
	refetchAllSchedules,
	deleteId,
	hideDeleteDowntimeScheduleModal,
	clearSearch,
	notifications,
}: DeleteDowntimeScheduleProps): void => {
	if (!deleteId) {
		const errorMsg = new Error('Something went wrong');
		console.error('Unable to delete, please provide correct deleteId');
		showErrorNotification(notifications, errorMsg);
	} else {
		deleteDowntimeScheduleAsync(deleteId, {
			onSuccess: () => {
				hideDeleteDowntimeScheduleModal();
				clearSearch();
				notifications.success({
					message: 'Downtime schedule Deleted Successfully',
				});
				refetchAllSchedules();
			},
			onError: (err) => {
				showErrorNotification(notifications, err);
			},
		});
	}
};

export const createEditDowntimeSchedule = async (
	props: DowntimeScheduleUpdatePayload,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	if (props.id && props.id > 0) {
		return updateDowntimeSchedule({ ...props });
	}
	return createDowntimeSchedule({ ...props.data });
};

export const recurrenceOptions = {
	doesNotRepeat: {
		label: 'Does not repeat',
		value: 'does-not-repeat',
	},
	daily: { label: 'Daily', value: 'daily' },
	weekly: { label: 'Weekly', value: 'weekly' },
	monthly: { label: 'Monthly', value: 'monthly' },
};

export const recurrenceWeeklyOptions = {
	monday: { label: 'Monday', value: 'monday' },
	tuesday: { label: 'Tuesday', value: 'tuesday' },
	wednesday: { label: 'Wednesday', value: 'wednesday' },
	thursday: { label: 'Thursday', value: 'thursday' },
	friday: { label: 'Friday', value: 'friday' },
	saturday: { label: 'Saturday', value: 'saturday' },
	sunday: { label: 'Sunday', value: 'sunday' },
};
interface DurationInfo {
	value: number;
	unit: string;
}

export function getDurationInfo(
	durationString: string | undefined | null,
): DurationInfo | null {
	if (!durationString) {
		return null;
	}

	// Regular expressions to extract hours, minutes
	const hoursRegex = /(\d+)h/;
	const minutesRegex = /(\d+)m/;

	// Extract hours, minutes from the duration string
	const hoursMatch = durationString.match(hoursRegex);
	const minutesMatch = durationString.match(minutesRegex);

	// Convert extracted values to integers, defaulting to 0 if not found
	const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
	const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

	// If there are no minutes and only hours, return the hours
	if (hours > 0 && minutes === 0) {
		return { value: hours, unit: 'h' };
	}

	// Otherwise, calculate the total duration in minutes
	const totalMinutes = hours * 60 + minutes;
	return { value: totalMinutes, unit: 'm' };
}

export interface Option {
	label: string;
	value: string;
}

export const recurrenceOptionWithSubmenu: Option[] = [
	recurrenceOptions.doesNotRepeat,
	recurrenceOptions.daily,
	recurrenceOptions.weekly,
	recurrenceOptions.monthly,
];

export const getRecurrenceOptionFromValue = (
	value?: string | Option | null,
): Option | null | undefined => {
	if (!value) {
		return null;
	}
	if (typeof value === 'string') {
		return Object.values(recurrenceOptions).find(
			(option) => option.value === value,
		);
	}
	return value;
};

export const getEndTime = ({
	kind,
	schedule,
}: Partial<
	DowntimeSchedules & {
		editMode: boolean;
	}
>): string | dayjs.Dayjs => {
	if (kind === 'fixed') {
		return schedule?.endTime || '';
	}

	return schedule?.recurrence?.endTime || '';
};

export const isScheduleRecurring = (
	schedule?: DowntimeSchedules['schedule'],
): boolean => (schedule ? !isEmpty(schedule?.recurrence) : false);

function convertUtcOffsetToTimezoneOffset(offsetMinutes: number): string {
	const sign = offsetMinutes >= 0 ? '+' : '-';
	const absOffset = Math.abs(offsetMinutes);
	const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
	const minutes = String(absOffset % 60).padStart(2, '0');
	return `${sign}${hours}:${minutes}`;
}

export function formatWithTimezone(
	dateValue?: string | dayjs.Dayjs,
	timezone?: string,
): string {
	const parsedDate =
		typeof dateValue === 'string' ? dateValue : dateValue?.format();

	// Get the target timezone offset
	const targetOffset = convertUtcOffsetToTimezoneOffset(
		dayjs(dateValue).tz(timezone).utcOffset(),
	);

	return `${parsedDate?.substring(0, 19)}${targetOffset}`;
}

export function handleTimeConversion(
	dateValue: string | dayjs.Dayjs,
	timezoneInit?: string,
	timezone?: string,
	shouldKeepLocalTime?: boolean,
): string {
	const timezoneChanged = !isEqual(timezoneInit, timezone);
	const initialTime = dayjs(dateValue).tz(timezoneInit);

	const formattedTime = formatWithTimezone(initialTime, timezone);
	return timezoneChanged
		? formattedTime
		: dayjs(dateValue).tz(timezone, shouldKeepLocalTime).format();
}
