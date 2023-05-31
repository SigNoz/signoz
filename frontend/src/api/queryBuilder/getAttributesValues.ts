import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import createQueryParams from 'lib/createQueryParams';
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
	filterAttributeKeyDataType,
	tagType,
	searchText,
}: IGetAttributeValuesPayload): Promise<
	SuccessResponse<IAttributeValuesResponse> | ErrorResponse
> => {
	try {
		const response = await ApiV3Instance.get(
			`/autocomplete/attribute_values?${createQueryParams({
				aggregateOperator,
				dataSource,
				aggregateAttribute,
				attributeKey,
				searchText,
			})}&filterAttributeKeyDataType=${filterAttributeKeyDataType}&tagType=${tagType}`,
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
