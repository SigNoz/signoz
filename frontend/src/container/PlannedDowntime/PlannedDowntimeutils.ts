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
import dayjs from 'dayjs';
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
	return dayjs(dateTimeString).format('MMM DD, YYYY h:mm A');
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
	// Regular expression to extract value and unit from the duration string
	const durationRegex = /(\d+)([hms])/;
	// Match the value and unit parts in the duration string
	const match = durationString.match(durationRegex);
	if (match && match.length >= 3) {
		// Extract value and unit from the match
		const value = parseInt(match[1], 10);
		const unit = match[2];
		// Return duration info object
		return { value, unit };
	}
	// If no value or unit part found, return null
	return null;
}
