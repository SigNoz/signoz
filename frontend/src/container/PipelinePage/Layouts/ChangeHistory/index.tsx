import { Table } from 'antd';
import { Pipeline } from 'types/api/pipeline/def';

import { changeHistoryColumns } from '../../PipelineListsView/config';
import { HistoryTableWrapper } from '../../styles';
import { historyPagination } from '../config';

function ChangeHistory({ piplineData }: ChangeHistoryProps): JSX.Element {
	return (
		<HistoryTableWrapper>
			<Table
				columns={changeHistoryColumns}
				dataSource={piplineData?.history ?? []}
				pagination={historyPagination}
			/>
		</HistoryTableWrapper>
	);
}

interface ChangeHistoryProps {
	piplineData: Pipeline;
}

export default ChangeHistory;
