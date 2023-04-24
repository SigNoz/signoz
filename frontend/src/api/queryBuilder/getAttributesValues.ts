import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	IAttributeValuesResponse,
	IGetAttributeValuesPayload,
} from 'types/api/queryBuilder/getAttributesValues';

export const getAttributesValues = async ({
	aggregateOperator,
	dataSource,
	aggregateAttribute,
	attributeKey,
	attributeKeyDataType,
	filterAttributeTagType,
	searchText,
}: IGetAttributeValuesPayload): Promise<
	SuccessResponse<IAttributeValuesResponse> | ErrorResponse
> => {
	try {
		const response = await ApiV3Instance.get(
			`/autocomplete/attribute_values?aggregateOperator=${aggregateOperator}&dataSource=${dataSource}&aggregateAttribute=${aggregateAttribute}&filterAttributeTagType=${filterAttributeTagType}&searchText=${searchText}&attributeKey=${attributeKey}&attributeKeyDataType=${attributeKeyDataType}`,
		);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
