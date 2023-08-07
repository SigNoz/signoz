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
			/>
		</HistoryTableWrapper>
	);
}

interface ChangeHistoryProps {
	pipelineData: Pipeline;
}

export default ChangeHistory;
