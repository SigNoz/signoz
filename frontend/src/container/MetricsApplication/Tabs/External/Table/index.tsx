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
import { makeDurationQuery, makeErrPercentQuery } from './queries';

interface TableProps {
	widgetId: string;
	serviceName: string;
}

const noDataPlaceholder = '-';

function Table(props: TableProps): JSX.Element {
	const { widgetId, serviceName } = props;
	const { t } = useTranslation(['common']);
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { notifications } = useNotifications();

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
			message: t('something_went_wrong'),
			description: durationResponse.error?.toString(),
		});
	}

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
			message: t('something_went_wrong'),
			description: errPercentResponse.error?.toString(),
		});
	}

	const tableRows = useMemo(
		() =>
			makeTableRows({
				duration: durationResponse.data?.payload?.data.result || [],
				errPercent: errPercentResponse.data?.payload?.data.result || [],
				reqRate: [],
			}),
		[durationResponse.data, errPercentResponse.data],
	);

	console.log('tableRows', tableRows);

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
