import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { Dayjs } from 'dayjs';
import { ErrorResponse, SuccessResponse } from 'types/api';

import { Recurrence } from './getAllDowntimeSchedules';

export interface DowntimeSchedulePayload {
	name: string;
	description?: string;
	alertIds: string[];
	schedule: {
		timezone?: string;
		startTime?: string | Dayjs;
		endTime?: string | Dayjs;
		recurrence?: Recurrence;
	};
}

export interface PayloadProps {
	status: string;
	data: string;
}

const createDowntimeSchedule = async (
	props: DowntimeSchedulePayload,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.post('/downtime_schedules', {
			...props,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default createDowntimeSchedule;
