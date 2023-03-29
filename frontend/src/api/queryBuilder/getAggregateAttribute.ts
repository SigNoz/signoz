import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError, AxiosResponse } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
// ** Types
import { IGetAggregateAttributePayload } from 'types/api/queryBuilder/getAggregatorAttribute';
import {
	IQueryAutocompleteResponse,
	IQueryAutocompleteResponseWithLabel,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

export const getAggregateAttribute = async ({
	aggregateOperator,
	searchText,
	dataSource,
}: IGetAggregateAttributePayload): Promise<
	SuccessResponse<IQueryAutocompleteResponseWithLabel> | ErrorResponse
> => {
	try {
		const response: AxiosResponse<{
			data: IQueryAutocompleteResponse;
		}> = await ApiV3Instance.get(
			`autocomplete/aggregate_attributes?aggregateOperator=${aggregateOperator}&dataSource=${dataSource}&searchText=${searchText}`,
		);

		const modifiedData: IQueryAutocompleteResponseWithLabel = {
			attributeKeys: response.data.data.attributeKeys.map((item) => ({
				...item,
				label: !item.isColumn ? `${item.type}_${item.key}` : item.key,
			})),
		};

		return {
			statusCode: 200,
			error: null,
			message: response.statusText,
			payload: modifiedData,
		};
	} catch (e) {
		return ErrorResponseHandler(e as AxiosError);
	}
};
