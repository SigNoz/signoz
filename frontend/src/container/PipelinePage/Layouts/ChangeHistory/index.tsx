import { Table } from 'antd';
import { useEffect } from 'react';
import { Pipeline } from 'types/api/pipeline/def';

import { changeHistoryColumns } from '../../PipelineListsView/config';
import { HistoryTableWrapper } from '../../styles';
import { historyPagination } from '../config';

function ChangeHistory({
	refetchPipelineLists,
	pipelineData,
}: ChangeHistoryProps): JSX.Element {
	useEffect(() => {
		let intervalId: null | NodeJS.Timer = null;

		const latestVersion = pipelineData?.history?.[0];
		const isLatestDeploymentFinished = ['DEPLOYED', 'FAILED'].includes(
			latestVersion?.deployStatus,
		);
		if (latestVersion && !isLatestDeploymentFinished) {
			intervalId = setInterval(refetchPipelineLists, 5000);
		}

		return (): void => {
			if (intervalId) {
				clearTimeout(intervalId);
			}
		};
	}, [pipelineData, refetchPipelineLists]);

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
	refetchPipelineLists: VoidFunction;
	pipelineData: Pipeline;
}

export default ChangeHistory;
