import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
// import { PayloadProps, Props } from 'types/api/metrics/getExternalError';

type ReqParam = {
	start: string;
	end: string;
	service: string;
};

type ResParam = {
	time: string;
	count: number;
	issueStatus: number;
};

const getDayBugList = async ({
	start,
	end,
	service,
}: ReqParam): // props: Props,
Promise<SuccessResponse<ResParam[]> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/getDayBugList?service=${service}&start=${start}&end=${end}`,
		);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

type RepeatIssuesParam = {
	serviceName: string;
	start: number;
	end: number;
	pagination?: {
		current: number;
		pageSize: number;
	};
	sortOrder?: string;
	sortParam?: string;
};
type DataType = {
	count: number;
	created_at: string;
	error_unique_id: string;
	issue_key: string;
	issue_project_id: string;
	issue_repeat_count: number;
	issue_status: string;
	issue_title: string;
	issue_type: string;
};
type RepeatResult = {
	issues: DataType[];
	pagination: {
		current: number;
		pageSize: number;
	};
	total: number;
};
const getRepeatIssuesTable = async ({
	start,
	end,
	serviceName,
	pagination,
	sortOrder,
	sortParam,
}: RepeatIssuesParam): // props: Props,
Promise<SuccessResponse<RepeatResult> | ErrorResponse> => {
	try {
		const response = await axios.post(`/getRepeatIssues`, {
			serviceName,
			start,
			end,
			pagination,
			sortOrder,
			sortParam,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export { getDayBugList, getRepeatIssuesTable };
