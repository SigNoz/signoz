import { ApiV3Instance as axios } from 'api';
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
	dataType: string;
	isColumn: boolean;
}

export type TagKeysPayloadProps = {
	data: { attributeKeys: AttributeKeyOptions[] };
};

export type TagValuePayloadProps = {
	data: { attributeValues: AttributeKeyOptions[] };
};
export const getAttributesKeys = async (
	props: TagKeyValueProps,
): Promise<SuccessResponse<TagKeysPayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/autocomplete/attribute_keys?aggregateOperator=${props.aggregateOperator}&dataSource=${props.dataSource}&aggregateAttribute=${props.aggregateAttribute}&searchText=${props.searchText}`,
		);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export type TagValueProps = {
	tagKey: string;
	metricName: string;
};

export const getAttributesValues = async (
	props: TagKeyValueProps,
): Promise<SuccessResponse<TagValuePayloadProps> | ErrorResponse> => {
	try {
		const response = await axios.get(
			`/autocomplete/attribute_keys?aggregateOperator=${props.aggregateOperator}&dataSource=${props.dataSource}&aggregateAttribute=${props.aggregateAttribute}&searchText=${props.searchText}&attributeKey=${props.attributeKey}`,
		);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
