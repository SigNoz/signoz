import { ReloadOutlined } from '@ant-design/icons';
import { Table } from 'antd';
import React, { useMemo } from 'react';
import { PipelineResponse } from 'types/api/pipeline/def';

import { changeHistoryColumns } from '../PipelineListsView/config';
import { getTableColumn } from '../PipelineListsView/utils';
import { HistoryTableWarapper, IconDataSpan } from '../styles';

function ChangeHistory({ piplineData }: ChangeHistoryProps): JSX.Element {
	const columns = useMemo(() => {
		const fieldColumns = getTableColumn(changeHistoryColumns);
		fieldColumns.push({
			title: 'Deployment Stage',
			key: 'deployStatus',
			dataIndex: 'deployStatus',
			render: (value: string): JSX.Element => (
				<div>
					<ReloadOutlined />
					<IconDataSpan>{value}</IconDataSpan>
				</div>
			),
		});
		return fieldColumns;
	}, []);

	return (
		<HistoryTableWarapper>
			<Table
				columns={columns}
				dataSource={piplineData.history}
				pagination={{
					defaultPageSize: 5,
				}}
			/>
		</HistoryTableWarapper>
	);
}

interface ChangeHistoryProps {
	piplineData: PipelineResponse;
}

export default ChangeHistory;
