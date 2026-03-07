import axios from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	GetSpanPercentilesProps,
	GetSpanPercentilesResponseDataProps,
} from 'types/api/trace/getSpanPercentiles';

const getSpanPercentiles = async (
	props: GetSpanPercentilesProps,
): Promise<SuccessResponseV2<GetSpanPercentilesResponseDataProps>> => {
	try {
		const response = await axios.post('/span_percentile', {
			...props,
		});

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
		throw error;
	}
};

export default getSpanPercentiles;
