import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError, AxiosResponse } from 'axios';
import { baseAutoCompleteIdKeysOrder } from 'constants/queryBuilder';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import createQueryParams from 'lib/createQueryParams';
// ** Helpers
import { ErrorResponse, SuccessResponse } from 'types/api';
// ** Types
import { IGetAggregateAttributePayload } from 'types/api/queryBuilder/getAggregatorAttribute';
import {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

export const getAggregateAttribute = async ({
	aggregateOperator,
	searchText,
	dataSource,
}: IGetAggregateAttributePayload): Promise<
	SuccessResponse<IQueryAutocompleteResponse> | ErrorResponse
> => {
	try {
		const response: AxiosResponse<{
			data: IQueryAutocompleteResponse;
		}> = await ApiV3Instance.get(
			`/autocomplete/aggregate_attributes?${createQueryParams({
				aggregateOperator,
				searchText,
				dataSource,
			})}`,
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
