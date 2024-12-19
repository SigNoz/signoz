import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

import { DowntimeSchedulePayload } from './createDowntimeSchedule';

export interface DowntimeScheduleUpdatePayload {
	data: DowntimeSchedulePayload;
	id?: number;
}

export interface PayloadProps {
	status: string;
	data: string;
}

const updateDowntimeSchedule = async (
	props: DowntimeScheduleUpdatePayload,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.put(`/downtime_schedules/${props.id}`, {
			...props.data,
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

export default updateDowntimeSchedule;
