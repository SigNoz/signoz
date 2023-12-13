import { PANEL_TYPES } from 'constants/queryBuilder';
import { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import { EQueryType } from 'types/common/dashboard';

export const queryRangeSuccessResponse: QueryRangePayload = {
	status: 'success',
	data: {
		resultType: '',
		result: [
			{
				status: 'success',
				data: {
					resultType: '',
					result: [
						{
							queryName: 'D',
							series: [
								{
									labels: {
										service_name: 'Test',
									},
									labelsArray: [
										{
											service_name: 'Test',
										},
									],
									values: [
										{
											timestamp: 1696917600000,
											value: '0',
										},
									],
								},
							],
							list: null,
						},
						{
							queryName: 'F1',
							series: null,
							list: null,
						},
						{
							queryName: 'A',
							series: [
								{
									labels: {
										service_name: 'Test',
									},
									labelsArray: [
										{
											service_name: 'Test',
										},
									],
									values: [
										{
											timestamp: 1696917600000,
											value: 'NaN',
										},
									],
								},
							],
							list: null,
						},
					],
				},
			},
		],
	},
	compositeQuery: {
		builderQueries: undefined,
		chQueries: undefined,
		promQueries: undefined,
		queryType: EQueryType.QUERY_BUILDER,
		panelType: PANEL_TYPES.TIME_SERIES,
	},
	end: 0,
	start: 0,
	step: 0,
};
