import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/queryBuilder/getValuesAutoComplete';

const getValuesAutoComplete = async (
	attributeKey: string,
	searchText: string,
	aggregateOperator: undefined | string = 'sum',
	dataSource: undefined | string = 'metrics',
	aggregateAttribute: undefined | string = 'signoz_calls_total',
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const data = await ApiV3Instance.get(
			`/autocomplete/attribute_values?aggregateOperator=${aggregateOperator}&dataSource=${dataSource}&aggregateAttribute=${aggregateAttribute}&attributeKey=${attributeKey}&searchText=${searchText}`,
		);

		return {
			statusCode: 200,
			error: null,
			message: '',
			payload: data.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default getValuesAutoComplete;
