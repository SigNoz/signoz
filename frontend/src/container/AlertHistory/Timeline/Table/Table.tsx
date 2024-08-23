import './table.styles.scss';

import { Table } from 'antd';
import { useTimelineTable } from 'pages/AlertDetails/hooks';
import { useMemo, useState } from 'react';

import { TimelineTableProps } from './types';
import { timelineTableColumns } from './useTimelineTable';

function TimelineTable({
	timelineData,
}: // totalItems,
TimelineTableProps): JSX.Element {
	const [searchText, setSearchText] = useState('');
	const { paginationConfig, onChangeHandler } = useTimelineTable();

	const visibleTimelineData = useMemo(() => {
		if (searchText === '') {
			return timelineData;
		}
		return timelineData.filter((data) =>
			JSON.stringify(data.labels).toLowerCase().includes(searchText.toLowerCase()),
		);
	}, [searchText, timelineData]);

	return (
		<div className="timeline-table">
			<Table
				rowKey={(row): string => `${row.fingerprint}-${row.value}`}
				columns={timelineTableColumns(setSearchText)}
				dataSource={visibleTimelineData}
				pagination={paginationConfig}
				size="middle"
				onChange={onChangeHandler}
				// TODO(shaheer): get total entries when we get an API for it
			/>
		</div>
	);
}

export default TimelineTable;
