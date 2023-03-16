import { ReloadOutlined } from '@ant-design/icons';
import { Table } from 'antd';
import React, { useMemo } from 'react';
import { Pipeline } from 'types/api/pipeline/def';

import { changeHistoryColumns } from '../PipelineListsView/config';
import { getTableColumn } from '../PipelineListsView/utils';
import { HistoryTableWarapper, IconDataSpan } from '../styles';
import { historyPagination } from './config';

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
				pagination={historyPagination}
			/>
		</HistoryTableWarapper>
	);
}

interface ChangeHistoryProps {
	piplineData: Pipeline;
}

export default ChangeHistory;
