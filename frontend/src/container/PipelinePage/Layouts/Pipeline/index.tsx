import { useState } from 'react';
import { Pipeline } from 'types/api/pipeline/def';

import PipelineListsView from '../../PipelineListsView';
import PipelinesActions from './PipelinesActions';

function PipelinePageLayout({
	refetchPipelineLists,
	pipelineData,
}: PipelinePageLayoutProps): JSX.Element {
	const [isActionType, setActionType] = useState<string>();
	const [isActionMode, setActionMode] = useState<string>('viewing-mode');

	return (
		<>
			<PipelinesActions
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
				pipelineData={pipelineData}
			/>
			<PipelineListsView
				isActionType={String(isActionType)}
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
				pipelineData={pipelineData}
				refetchPipelineLists={refetchPipelineLists}
			/>
		</>
	);
}

interface PipelinePageLayoutProps {
	refetchPipelineLists: VoidFunction;
	pipelineData: Pipeline;
}

export default PipelinePageLayout;
