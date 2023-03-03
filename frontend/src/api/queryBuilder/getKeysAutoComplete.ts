import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/queryBuilder/getKeysAutoComplete';

const getKeysAutoComplete = async (
	searchText?: string,
): Promise<SuccessResponse<PayloadProps[]> | ErrorResponse> => {
	try {
		const data = await axios({
			method: 'get',
			url: `/api/v3/autocomplete/attribute_keys?aggregateOperator=sum&dataSource=metrics&aggregateAttribute=signoz_calls_total&searchText=${
				searchText || ''
			}`,
			baseURL: 'http://34.229.125.174:3301',
		});

		return {
			statusCode: 200,
			error: null,
			message: '',
			payload: data.data.data.attributeKeys,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getKeysAutoComplete;
