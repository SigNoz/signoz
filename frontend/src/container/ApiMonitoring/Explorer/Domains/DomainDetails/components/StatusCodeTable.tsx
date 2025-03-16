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
		<div className="status-code-table-container">
			<Table
				loading={isLoading || isRefetching}
				dataSource={statusCodeData || []}
				columns={endPointStatusCodeColumns}
				pagination={false}
				rowClassName={(_, index): string =>
					index % 2 === 0 ? 'table-row-dark' : 'table-row-light'
				}
			/>
		</div>
	);
}

export default StatusCodeTable;
