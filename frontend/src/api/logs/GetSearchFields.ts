import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/logs/getSearchFields';

const GetSearchFields = async (): Promise<
	SuccessResponse<PayloadProps> | ErrorResponse
> => {
	try {
		const data = await new Promise((resolve) => resolve(MockResponse));
		return {
			statusCode: 200,
			error: null,
			message: '',
			payload: data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default GetSearchFields;

const MockResponse = {
	selected: [
		{
			name: 'timestamp',
			dataType: 'UInt64',
			type: 'static',
		},
		{
			name: 'id',
			dataType: 'String',
			type: 'static',
		},
		{
			name: 'method',
			dataType: 'String',
			type: 'attributes',
		},
		// when extracted fields will be added in future
		{
			name: 'duration',
			type: 'extracted',
			dataType: 'Int32',
		},
	],
	interesting: [
		{
			name: 'trace_id',
			dataType: 'String',
			type: 'static',
		},
		{
			name: 'span_id',
			dataType: 'String',
			type: 'static',
		},
		{
			name: 'trace_flags',
			dataType: 'UInt32',
			type: 'static',
		},
		{
			name: 'severity_text',
			dataType: 'LowCardinality(String)',
			type: 'static',
		},
		{
			name: 'severity_number',
			dataType: 'Int32',
			type: 'static',
		},

		{
			name: 'int',
			dataType: 'Int64',
			type: 'attributes',
		},
		{
			name: 'request',
			dataType: 'String',
			type: 'attributes',
		},
		{
			name: 'datetime',
			dataType: 'String',
			type: 'attributes',
		},
		{
			name: 'status',
			dataType: 'Float64',
			type: 'attributes',
		},
		{
			name: 'host',
			dataType: 'String',
			type: 'attributes',
		},
		{
			name: 'referer',
			dataType: 'String',
			type: 'attributes',
		},
		{
			name: 'user-identifier',
			dataType: 'String',
			type: 'attributes',
		},
		{
			name: 'bytes',
			dataType: 'Float64',
			type: 'attributes',
		},
		{
			name: 'protocol',
			dataType: 'String',
			type: 'attributes',
		},
		{
			name: 'host',
			dataType: 'String',
			type: 'resources',
		},

		// when extracted fields will be added in future
		{
			name: 'duration1',
			type: 'extracted',
			dataType: 'Int32',
		},
	],
};
