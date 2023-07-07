import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { SuccessResponse } from 'types/api/index';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

export const convertDataValueToMs = (
	data?: SuccessResponse<MetricRangePayloadProps>,
): SuccessResponse<MetricRangePayloadProps> | undefined => {
	const convertedData = data;

	const convertedResult: QueryData[] = data?.payload?.data?.result
		? data.payload.data.result.map((item) => {
				const values: [number, string][] = item.values.map((value) => {
					const [first = 0, second = ''] = value || [];
					return [first, getMs(second)];
				});

				return { ...item, values };
		  })
		: [];

	if (convertedData?.payload?.data?.result && convertedResult) {
		convertedData.payload.data.result = convertedResult;
	}

	return convertedData;
};
