import { Table } from 'antd';
import {
	endPointStatusCodeColumns,
	getFormattedEndPointStatusCodeData,
} from 'container/ApiMonitoring/utils';
import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';

function StatusCodeTable({
	endPointStatusCodeDataQuery,
}: {
	endPointStatusCodeDataQuery: UseQueryResult<SuccessResponse<any>, unknown>;
}): JSX.Element {
	const { isLoading, isRefetching, isError, data } = endPointStatusCodeDataQuery;

	const statusCodeData = useMemo(() => {
		if (isLoading || isRefetching || isError) {
			return [];
		}

		return getFormattedEndPointStatusCodeData(
			data?.payload?.data?.result[0].table.rows,
		);
	}, [data?.payload?.data?.result, isLoading, isRefetching, isError]);

	return (
		<Table
			loading={isLoading || isRefetching || statusCodeData.length === 0}
			dataSource={statusCodeData || []}
			columns={endPointStatusCodeColumns}
			pagination={false}
		/>
	);
}

export default StatusCodeTable;
