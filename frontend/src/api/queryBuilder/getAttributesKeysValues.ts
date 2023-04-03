import { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';

export type TagKeyValueProps = {
	dataSource: string;
	aggregateOperator?: string;
	aggregateAttribute?: string;
	searchText?: string;
	attributeKey?: string;
};

export interface AttributeKeyOptions {
	key: string;
	type: string;
	dataType: 'string' | 'boolean' | 'number';
	isColumn: boolean;
}

export const getAttributesKeys = async (
	props: TagKeyValueProps,
): Promise<SuccessResponse<AttributeKeyOptions[]> | ErrorResponse> => {
	try {
		const response = await ApiV3Instance.get(
			`/autocomplete/attribute_keys?aggregateOperator=${props.aggregateOperator}&dataSource=${props.dataSource}&aggregateAttribute=${props.aggregateAttribute}&searchText=${props.searchText}`,
		);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data.attributeKeys,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export interface TagValuePayloadProps {
	boolAttributeValues: null | string[];
	numberAttributeValues: null | string[];
	stringAttributeValues: null | string[];
}

export const getAttributesValues = async (
	props: TagKeyValueProps,
): Promise<SuccessResponse<TagValuePayloadProps> | ErrorResponse> => {
	try {
		const response = await ApiV3Instance.get(
			`/autocomplete/attribute_values?aggregateOperator=${props.aggregateOperator}&dataSource=${props.dataSource}&aggregateAttribute=${props.aggregateAttribute}&searchText=${props.searchText}&attributeKey=${props.attributeKey}`,
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
