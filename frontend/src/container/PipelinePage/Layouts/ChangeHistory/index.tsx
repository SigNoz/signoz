import { ReloadOutlined } from '@ant-design/icons';
import { Table } from 'antd';
import React, { useMemo } from 'react';
import { Pipeline } from 'types/api/pipeline/def';

import { changeHistoryColumns } from '../../PipelineListsView/config';
import { getTableColumn } from '../../PipelineListsView/utils';
import { HistoryTableWrapper, IconDataSpan } from '../../styles';
import { historyPagination } from '../config';

function ChangeHistory({ piplineData }: ChangeHistoryProps): JSX.Element {
	const columns = useMemo(() => {
		const fieldColumns = getTableColumn(changeHistoryColumns);
		fieldColumns.push({
			title: 'Deployment Stage',
			key: 'deployStatus',
			dataIndex: 'deployStatus',
			render: (value: string): JSX.Element => (
				<>
					<ReloadOutlined />
					<IconDataSpan>{value}</IconDataSpan>
				</>
			),
		});
		return fieldColumns;
	}, []);

	return (
		<HistoryTableWrapper>
			<Table
				columns={columns}
				dataSource={piplineData.history}
				pagination={historyPagination}
			/>
		</HistoryTableWrapper>
	);
}

interface ChangeHistoryProps {
	piplineData: Pipeline;
}

export default ChangeHistory;
