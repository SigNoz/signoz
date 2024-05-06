import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

// import downtimeListResponse from './response.json';

export type Recurrence = {
	startTime: string | null;
	endTime: string | null;
	duration: string | null;
	repeatType: string | null;
	repeatOn: string[] | null;
};

type Schedule = {
	timezone: string | null;
	startTime: string | null;
	endTime: string | null;
	recurrence: Recurrence | null;
};

export interface DowntimeSchedules {
	id: number;
	name: string | null;
	description: string | null;
	schedule: Schedule | null;
	alertIds: string[] | null;
	createdAt: string | null;
	createdBy: string | null;
	updatedAt: string | null;
	updatedBy: string | null;
}
export type PayloadProps = DowntimeSchedules[];

const getAllDowntimeSchedules = async (): Promise<
	SuccessResponse<PayloadProps> | ErrorResponse
> => {
	try {
		const response = await axios.get('/downtime_schedules');
		// const response = downtimeListResponse;

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
			// payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getAllDowntimeSchedules;
