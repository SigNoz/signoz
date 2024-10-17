import { ApiBaseInstance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import createQueryParams from 'lib/createQueryParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	IAttributeValuesResponse,
	IGetAttributeValuesPayload,
} from 'types/api/queryBuilder/getAttributesValues';

export const getInfraAttributesValues = async ({
	dataSource,
	attributeKey,
	filterAttributeKeyDataType,
	tagType,
	searchText,
}: IGetAttributeValuesPayload): Promise<
	SuccessResponse<IAttributeValuesResponse> | ErrorResponse
> => {
	try {
		const response = await ApiBaseInstance.get(
			`/hosts/attribute_values?${createQueryParams({
				dataSource,
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
