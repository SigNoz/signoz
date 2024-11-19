import { ApiBaseInstance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError, AxiosResponse } from 'axios';
import { baseAutoCompleteIdKeysOrder } from 'constants/queryBuilder';
import { createIdFromObjectFields } from 'lib/createIdFromObjectFields';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

export const getHostAttributeKeys = async (
	searchText = '',
): Promise<SuccessResponse<IQueryAutocompleteResponse> | ErrorResponse> => {
	try {
		const response: AxiosResponse<{
			data: IQueryAutocompleteResponse;
		}> = await ApiBaseInstance.get(
			`/hosts/attribute_keys?dataSource=metrics&searchText=${searchText}`,
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
