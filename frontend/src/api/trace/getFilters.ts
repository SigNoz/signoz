import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getFilters';
import convertObjectIntoParams from 'lib/query/convertObjectIntoParams';

const getRetention = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const params = convertObjectIntoParams(props);

		const updatedQueryParams = `start=${props.start}&end=${
			props.end
		}&getFilters=${JSON.stringify(props.getFilters)}`;

		const response = await axios.get<PayloadProps>(
			`/getSpanFilters?${updatedQueryParams}`,
		);

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getRetention;
