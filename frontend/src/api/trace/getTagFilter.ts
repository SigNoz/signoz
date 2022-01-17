import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import convertObjectIntoParams from 'lib/query/convertObjectIntoParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps, Props } from 'types/api/trace/getTagFilters';

const getTagFilters = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const updatedQueryParams = `start=${props.start}&end=${
			props.end
		}&${encodeURIComponent(convertObjectIntoParams(props.other, true))}`;

		const response = await axios.get<PayloadProps>(
			`/getTagFilters?${updatedQueryParams}`,
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

export default getTagFilters;
