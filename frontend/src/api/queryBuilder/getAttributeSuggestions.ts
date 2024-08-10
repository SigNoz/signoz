import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError, AxiosResponse } from 'axios';
import { baseAutoCompleteIdKeysOrder } from 'constants/queryBuilder';
import { encode } from 'js-base64';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import createQueryParams from 'lib/createQueryParams';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	IGetAttributeSuggestionsPayload,
	IGetAttributeSuggestionsSuccessResponse,
} from 'types/api/queryBuilder/getAttributeSuggestions';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const getAttributeSuggestions = async ({
	searchText,
	dataSource,
	filters,
}: IGetAttributeSuggestionsPayload): Promise<
	SuccessResponse<IGetAttributeSuggestionsSuccessResponse> | ErrorResponse
> => {
	try {
		let base64EncodedFiltersString;
		try {
			// the replace function is to remove the padding at the end of base64 encoded string which is auto added to make it a multiple of 4
			// why ? because the current working of qs doesn't work well with padding
			base64EncodedFiltersString = encode(JSON.stringify(filters)).replace(
				/=+$/,
				'',
			);
		} catch {
			// default base64 encoded string for empty filters object
			base64EncodedFiltersString = 'eyJpdGVtcyI6W10sIm9wIjoiQU5EIn0';
		}
		const response: AxiosResponse<{
			data: IGetAttributeSuggestionsSuccessResponse;
		}> = await ApiV3Instance.get(
			`/filter_suggestions?${createQueryParams({
				searchText,
				dataSource,
				existingFilter: base64EncodedFiltersString,
			})}`,
		);

		const payload: BaseAutocompleteData[] =
			response.data.data.attributes?.map(({ id: _, ...item }) => ({
				...item,
				id: createIdFromObjectFields(item, baseAutoCompleteIdKeysOrder),
			})) || [];

		return {
			statusCode: 200,
			error: null,
			message: response.statusText,
			payload: {
				attributes: payload,
				example_queries: response.data.data.example_queries,
			},
		};
	} catch (e) {
		return ErrorResponseHandler(e as AxiosError);
	}
};
