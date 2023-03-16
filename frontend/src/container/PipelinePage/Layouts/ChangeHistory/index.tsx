import { Table } from 'antd';
import React, { useMemo } from 'react';
import { Pipeline } from 'types/api/pipeline/def';

import { changeHistoryColumns } from '../../PipelineListsView/config';
import { getTableColumn } from '../../PipelineListsView/utils';
import { HistoryTableWrapper } from '../../styles';
import { historyPagination } from '../config';
import DeploymentStage from './DeploymentStage';

function ChangeHistory({ piplineData }: ChangeHistoryProps): JSX.Element {
	const columns = useMemo(() => {
		const fieldColumns = getTableColumn(changeHistoryColumns);
		fieldColumns.push({
			title: 'Deployment Stage',
			key: 'deployStatus',
			dataIndex: 'deployStatus',
			render: DeploymentStage,
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
