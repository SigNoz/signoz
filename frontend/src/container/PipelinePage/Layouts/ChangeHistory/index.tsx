import type { HTMLAttributes } from 'react';
import { Table } from 'antd';
import { Pipeline } from 'types/api/pipeline/def';

import { changeHistoryColumns } from '../../PipelineListsView/config';
import { HistoryTableWrapper } from '../../styles';
import { historyPagination } from '../config';

function ChangeHistory({ pipelineData }: ChangeHistoryProps): JSX.Element {
	return (
		<HistoryTableWrapper>
			<Table
				columns={changeHistoryColumns}
				dataSource={pipelineData?.history ?? []}
				rowKey="id"
				pagination={historyPagination}
				onRow={(): HTMLAttributes<HTMLElement> & { 'data-testid': string } => ({
					'data-testid': 'change-history-row',
				})}
			/>
		</HistoryTableWrapper>
	);
}

interface ChangeHistoryProps {
	pipelineData: Pipeline;
}

export default ChangeHistory;
