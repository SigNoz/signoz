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

export { getDayBugList };
