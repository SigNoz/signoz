import { ColumnsType } from 'antd/lib/table';
import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import React, { useEffect, useMemo } from 'react';
import Highlighter from 'react-highlight-words';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
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
import { ReduceToVariant } from './reduceTo';
import Toolbar from './Toolbar';

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
	const [addressFilter, setAddressFilter] = React.useState<string>('');
	const [reduceTo, setReduceTo] = React.useState<ReduceToVariant>('latest');

	const { t } = useTranslation(['common']);
	const { notifications } = useNotifications();

	const reqRateQuery: GetQueryResultsProps = makeReqRateQuery({
		widgetId: `${widgetId}-req-rate`,
		selectedTime,
		serviceName,
	});

	const errPercentQuery: GetQueryResultsProps = makeErrPercentQuery({
		widgetId: `${widgetId}-err-percent`,
		selectedTime,
		serviceName,
	});

	const durationQuery: GetQueryResultsProps = makeDurationQuery({
		widgetId: `${widgetId}-duration`,
		selectedTime,
		serviceName,
	});

	const [reqRateResponse, errPercentResponse, durationResponse] = useQueries([
		{
			queryKey: `${widgetId}-req-rate`,
			queryFn: (): Promise<
				SuccessResponse<MetricRangePayloadProps> | ErrorResponse
			> => GetMetricQueryRange(reqRateQuery),
		},
		{
			queryKey: `${widgetId}-err-percent`,
			queryFn: (): Promise<
				SuccessResponse<MetricRangePayloadProps> | ErrorResponse
			> => GetMetricQueryRange(errPercentQuery),
		},
		{
			queryKey: `${widgetId}-duration`,
			queryFn: (): Promise<
				SuccessResponse<MetricRangePayloadProps> | ErrorResponse
			> => GetMetricQueryRange(durationQuery),
		},
	]);

	useEffect(() => {
		const responses = [reqRateResponse, errPercentResponse, durationResponse];
		responses.forEach((res) => {
			if (res.error) {
				notifications.error({
					message: t('something_went_wrong'),
					description: `Unable to fetch table data. ${res.error.toString()}`,
				});
			}
		});
	}, [durationResponse, errPercentResponse, notifications, reqRateResponse, t]);

	const tableRows = useMemo(
		() =>
			makeTableRows({
				duration: durationResponse.data?.payload?.data.result || [],
				errPercent: errPercentResponse.data?.payload?.data.result || [],
				reqRate: reqRateResponse.data?.payload?.data.result || [],
				reduceTo,
			}),
		[
			reqRateResponse.data,
			durationResponse.data,
			errPercentResponse.data,
			reduceTo,
		],
	);

	const tableRowsFiltered = useMemo(() => {
		if (!addressFilter) {
			return tableRows;
		}
		return tableRows.filter((row) => row.address.includes(addressFilter));
	}, [tableRows, addressFilter]);

	const tableColumns: ColumnsType<TableRow> = useMemo(
		() => [
			{
				title: 'Address',
				dataIndex: 'address',
				key: 'address',
				defaultSortOrder: 'ascend',
				sorter: (a: TableRow, b: TableRow): number =>
					a.address.localeCompare(b.address, 'en', { numeric: true }),
				render: (value: string): JSX.Element => (
					<Highlighter
						highlightClassName="highlight-substring"
						searchWords={[addressFilter]}
						autoEscape
						textToHighlight={value}
					/>
				),
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
		],
		[addressFilter],
	);

	return (
		<div>
			<Toolbar
				addressFilter={addressFilter}
				onAddressFilterChange={setAddressFilter}
				reduceTo={reduceTo}
				onReduceToChange={setReduceTo}
			/>
			<ResizeTable
				key={addressFilter /* Force cell re-render on filter value change. */}
				columns={tableColumns}
				rowKey="address"
				dataSource={tableRowsFiltered}
			/>
		</div>
	);
}

export default Table;
