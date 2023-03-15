import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/queryBuilder/getKeysAutoComplete';

import { getSearchParams } from '../../utils/getSearchParams';

const getKeysAutoComplete = async (
	searchText?: string,
	aggregateOperator: undefined | string = 'sum',
	dataSource: undefined | string = 'metrics',
	aggregateAttribute: undefined | string = 'signoz_calls_total',
): Promise<SuccessResponse<PayloadProps[]> | ErrorResponse> => {
	const params = getSearchParams({
		searchText: searchText || '',
		aggregateOperator,
		dataSource,
		aggregateAttribute,
	});

	try {
		const data = await ApiV3Instance.get(`autocomplete/attribute_keys`, {
			params,
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
