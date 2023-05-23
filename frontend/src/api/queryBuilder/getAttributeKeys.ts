import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError, AxiosResponse } from 'axios';
import createQueryParams from 'lib/createQueryParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
// ** Types
import { IGetAttributeKeysPayload } from 'types/api/queryBuilder/getAttributeKeys';
import {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { v4 as uuid } from 'uuid';

export const getAggregateKeys = async ({
	aggregateOperator,
	searchText,
	dataSource,
	aggregateAttribute,
	tagType,
}: IGetAttributeKeysPayload): Promise<
	SuccessResponse<IQueryAutocompleteResponse> | ErrorResponse
> => {
	try {
		const response: AxiosResponse<{
			data: IQueryAutocompleteResponse;
		}> = await ApiV3Instance.get(
			`autocomplete/attribute_keys?${createQueryParams({
				aggregateOperator,
				searchText,
				dataSource,
				aggregateAttribute,
			})}&tagType=${tagType}`,
		);

		const payload: BaseAutocompleteData[] =
			response.data.data.attributeKeys?.map((item) => ({ ...item, id: uuid() })) ||
			[];

		return {
			statusCode: 200,
			error: null,
			message: response.statusText,
			payload: { attributeKeys: payload },
		};
	} catch (e) {
		return ErrorResponseHandler(e as AxiosError);
	}
};
