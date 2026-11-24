import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import type { AxiosError, AxiosResponse } from 'axios';
import { baseAutoCompleteIdKeysOrder } from 'constants/queryBuilder';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import createQueryParams from 'lib/createQueryParams';
// ** Helpers
import type { ErrorResponse, SuccessResponse } from 'types/api';
// ** Types
import type { IGetAggregateAttributePayload } from 'types/api/queryBuilder/getAggregatorAttribute';
import type {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

export const getAggregateAttribute = async ({
	aggregateOperator,
	searchText,
	dataSource,
	source,
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
				dataSource: source === 'meter' ? 'meter' : dataSource,
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
