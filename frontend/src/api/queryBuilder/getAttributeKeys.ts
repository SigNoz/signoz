import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError, AxiosResponse } from 'axios';
import { baseAutoCompleteIdKeysOrder } from 'constants/queryBuilder';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import createQueryParams from 'lib/createQueryParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { IGetAttributeKeysPayload } from 'types/api/queryBuilder/getAttributeKeys';
import {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

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
			`/autocomplete/attribute_keys?${createQueryParams({
				aggregateOperator,
				searchText,
				dataSource,
				aggregateAttribute,
			})}&tagType=${tagType}`,
		);

		const payload: BaseAutocompleteData[] =
			response.data.data.attributeKeys?.map(({ id: _, ...item }) => ({
				...item,
				id: createIdFromObjectFields(item, baseAutoCompleteIdKeysOrder),
			})) || [];

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
