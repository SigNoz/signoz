import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'store/actions/dashboard/getQueryResults';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { GlobalReducer } from 'types/reducer/globalTime';

import { makeTableRows, TableRow } from './calculations';
import {
	makeDurationQuery,
	makeErrPercentQuery,
	makeReqRateQuery,
} from './queries';

interface TableProps {
	widgetId: string;
	serviceName: string;
}

const noDataPlaceholder = '-';

function Table(props: TableProps): JSX.Element {
	const { widgetId, serviceName } = props;
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	console.log('selected time', selectedTime);

	const { t } = useTranslation(['common']);
	const { notifications } = useNotifications();
	const errorMessage = t('something_went_wrong');

	// BEGIN Request rate
	const reqRateQuery: GetQueryResultsProps = makeReqRateQuery({
		widgetId: `${widgetId}-req-rate`,
		selectedTime,
		serviceName,
	});

	const reqRateResponse = useQuery<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>(`${widgetId}-req-rate`, () => GetMetricQueryRange(reqRateQuery));

	if (reqRateResponse.isError) {
		notifications.error({
			message: errorMessage,
			description: `Unable to fetch request rate data. ${reqRateResponse.error?.toString()}`,
		});
	}
	// END Request rate

	// BEGIN Duration
	const durationQuery: GetQueryResultsProps = makeDurationQuery({
		widgetId: `${widgetId}-duration`,
		selectedTime,
		serviceName,
	});

	const durationResponse = useQuery<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>(`${widgetId}-duration`, () => GetMetricQueryRange(durationQuery));

	if (durationResponse.isError) {
		notifications.error({
			message: errorMessage,
			description: `Unable to fetch duration response data. ${durationResponse.error?.toString()}`,
		});
	}
	// END Duration

	// BEGIN Error percentage
	const errPercentQuery: GetQueryResultsProps = makeErrPercentQuery({
		widgetId: `${widgetId}-err-percent`,
		selectedTime,
		serviceName,
	});

	const errPercentResponse = useQuery<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>(`${widgetId}-err-percent`, () => GetMetricQueryRange(errPercentQuery));

	if (errPercentResponse.isError) {
		notifications.error({
			message: errorMessage,
			description: `Unable to fetch error percentage data. ${errPercentResponse.error?.toString()}`,
		});
	}
	// END Error percentage

	const tableRows = useMemo(
		() =>
			makeTableRows({
				duration: durationResponse.data?.payload?.data.result || [],
				errPercent: errPercentResponse.data?.payload?.data.result || [],
				reqRate: reqRateResponse.data?.payload?.data.result || [],
			}),
		[reqRateResponse.data, durationResponse.data, errPercentResponse.data],
	);

	return (
		<div>
			<ResizeTable
				columns={[
					{
						title: 'Address',
						dataIndex: 'address',
						key: 'address',
						sorter: (a: TableRow, b: TableRow): number =>
							a.address.localeCompare(b.address, 'en', { numeric: true }),
					},
					{
						title: 'Req. rate',
						dataIndex: 'reqRate',
						key: 'reqRate',
						sorter: (a: TableRow, b: TableRow): number =>
							(a.reqRate || 0) - (b.reqRate || 0),
						render: (value: number | undefined): string =>
							value === undefined ? noDataPlaceholder : value.toFixed(2),
					},
					{
						title: 'Error %',
						dataIndex: 'errPercent',
						key: 'errPercent',
						defaultSortOrder: 'descend',
						sorter: (a: TableRow, b: TableRow): number =>
							(a.errPercent || 0) - (b.errPercent || 0),
						render: (value: number | undefined): string =>
							value === undefined ? noDataPlaceholder : value.toFixed(2),
					},
					{
						title: 'Duration (ms)',
						dataIndex: 'duration',
						key: 'duration',
						sorter: (a: TableRow, b: TableRow): number =>
							(a.duration || 0) - (b.duration || 0),
						render: (value: number | undefined): string =>
							value === undefined ? noDataPlaceholder : value.toFixed(2),
					},
				]}
				rowKey="address"
				dataSource={tableRows}
			/>
		</div>
	);
}

export default Table;
