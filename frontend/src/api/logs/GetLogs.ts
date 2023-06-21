import axios, { ApiV3Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import {
	ErrorResponse,
	ErrorResponseV3,
	SuccessResponse,
	SuccessResponseV3,
} from 'types/api';
import { PayloadProps, Props } from 'types/api/logs/getLogs';

const GetLogs = async (
	props: Props,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	try {
		const data = await axios.get(`/logs`, {
			params: props,
		});

		return {
			statusCode: 200,
			error: null,
			message: '',
			payload: data.data.results,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export const GetLogsV3 = async ({
	timestampEnd,
	timestampStart,
	limit,
	id,
	idGt,
}: Props): Promise<SuccessResponseV3<PayloadProps> | ErrorResponseV3> => {
	try {
		const data = await ApiV3Instance.post(`query_range`, {
			start: timestampStart,
			end: timestampEnd,
			step: 60,
			dataSource: 'logs',
			compositeQuery: {
				queryType: 'builder',
				panelType: 'list',
				builderQueries: {
					A: {
						queryName: 'A',
						dataSource: 'logs',
						aggregateOperator: 'noop',
						expression: 'A',
						disabled: false,
						pageSize: limit,
						filters: {
							items: [
								{
									key: {
										key: 'id',
										type: '',
										dataType: 'string',
										isColumn: true,
									},
									op: `${idGt ? '>' : '<'}`,
									value: id,
								},
							],
							op: 'AND',
						},
						orderBy: [
							{
								columnName: 'id',
								order: 'asc',
							},
						],
					},
				},
			},
		});

		return {
			status: 200,
			error: null,
			data: data.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};

export default GetLogs;
