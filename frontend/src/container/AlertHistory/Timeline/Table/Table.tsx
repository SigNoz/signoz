import './table.styles.scss';

import { Table } from 'antd';
import { QueryParams } from 'constants/query';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useTimelineTable } from 'pages/AlertDetails/hooks';
import { useMemo, useState } from 'react';
import { useQueryClient } from 'react-query';
import { useLocation } from 'react-router-dom';
import { PayloadProps } from 'types/api/alerts/get';

import { TimelineTableProps } from './types';
import { timelineTableColumns } from './useTimelineTable';

function TimelineTable({
	timelineData,
	totalItems,
}: TimelineTableProps): JSX.Element {
	const [searchText, setSearchText] = useState('');
	const { paginationConfig, onChangeHandler } = useTimelineTable({ totalItems });

	const visibleTimelineData = useMemo(() => {
		if (searchText === '') {
			return timelineData;
		}
		return timelineData.filter((data) =>
			JSON.stringify(data.labels).toLowerCase().includes(searchText.toLowerCase()),
		);
	}, [searchText, timelineData]);

	const queryClient = useQueryClient();

	const { search } = useLocation();
	const params = new URLSearchParams(search);

	const ruleId = params.get(QueryParams.ruleId);

	const { currentUnit, targetUnit } = useMemo(() => {
		const alertDetailsQuery = queryClient.getQueryData([
			REACT_QUERY_KEY.ALERT_RULE_DETAILS,
			ruleId,
		]) as {
			payload: PayloadProps;
		};
		const { targetUnit } = alertDetailsQuery.payload.data.condition;
		const {
			unit: currentUnit,
		} = alertDetailsQuery.payload.data.condition.compositeQuery;

		return { currentUnit, targetUnit };
	}, [queryClient, ruleId]);

	return (
		<div className="timeline-table">
			<Table
				rowKey={(row): string => `${row.fingerprint}-${row.value}`}
				columns={timelineTableColumns(setSearchText, currentUnit, targetUnit)}
				dataSource={visibleTimelineData}
				pagination={paginationConfig}
				size="middle"
				onChange={onChangeHandler}
			/>
		</div>
	);
}

export default TimelineTable;
