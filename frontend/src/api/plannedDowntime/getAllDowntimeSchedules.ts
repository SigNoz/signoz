import axios from 'api';
import { AxiosError, AxiosResponse } from 'axios';
import { Option } from 'container/PlannedDowntime/PlannedDowntimeutils';
import { useQuery, UseQueryResult } from 'react-query';

export type Recurrence = {
	startTime?: string | null;
	endTime?: string | null;
	duration?: number | string | null;
	repeatType?: string | Option | null;
	repeatOn?: string[] | null;
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
	kind: string | null;
}
export type PayloadProps = { data: DowntimeSchedules[] };

export const getAllDowntimeSchedules = async (
	props?: GetAllDowntimeSchedulesPayloadProps,
): Promise<AxiosResponse<PayloadProps>> =>
	axios.get('/downtime_schedules', { params: props });

export interface GetAllDowntimeSchedulesPayloadProps {
	active?: boolean;
	recurrence?: boolean;
}

export const useGetAllDowntimeSchedules = (
	props?: GetAllDowntimeSchedulesPayloadProps,
): UseQueryResult<AxiosResponse<PayloadProps>, AxiosError> =>
	useQuery<AxiosResponse<PayloadProps>, AxiosError>({
		queryKey: ['getAllDowntimeSchedules', props],
		queryFn: () => getAllDowntimeSchedules(props),
	});
