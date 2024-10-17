import { ApiBaseInstance, ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError, AxiosResponse } from 'axios';
import { baseAutoCompleteIdKeysOrder } from 'constants/queryBuilder';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import createQueryParams from 'lib/createQueryParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
// ** Types
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
	isInfraMonitoring,
}: IGetAttributeKeysPayload): Promise<
	SuccessResponse<IQueryAutocompleteResponse> | ErrorResponse
> => {
	try {
		const endpoint = isInfraMonitoring
			? `/hosts/attribute_keys?dataSource=metrics&searchText=${searchText || ''}`
			: `/autocomplete/attribute_keys?${createQueryParams({
					aggregateOperator,
					searchText,
					dataSource,
					aggregateAttribute,
			  })}&tagType=${tagType}`;

		const apiInstance = isInfraMonitoring ? ApiBaseInstance : ApiV3Instance;

		const response: AxiosResponse<{
			data: IQueryAutocompleteResponse;
		}> = await apiInstance.get(endpoint);

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
