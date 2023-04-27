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

import { makeTableRows } from './calculations';
import { makeDurationQuery } from './queries';

interface TableProps {
	widgetId: string;
	serviceName: string;
}

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

	console.log('addressesRes', durationResponse);

	const tableRows = useMemo(
		() =>
			makeTableRows({
				duration: durationResponse.data?.payload?.data.result || [],
				errorPercentage: durationResponse.data?.payload?.data.result || [],
				reqRate: durationResponse.data?.payload?.data.result || [],
			}),
		[durationResponse.data],
	);

	return (
		<div>
			<ResizeTable
				columns={[
					{
						title: 'Address',
						dataIndex: 'address',
						key: 'address',
					},
					{
						title: 'Req. rate',
						dataIndex: 'reqRate',
						key: 'reqRate',
					},
					{
						title: 'Error %',
						dataIndex: 'errPercentage',
						key: 'errPercentage',
					},
					{
						title: 'Duration (ms)',
						dataIndex: 'duration',
						key: 'duration',
					},
				]}
				dataSource={tableRows}
			/>
		</div>
	);
}

export default Table;
