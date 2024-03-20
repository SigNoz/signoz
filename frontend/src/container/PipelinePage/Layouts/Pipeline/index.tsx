import cloneDeep from 'lodash-es/cloneDeep';
import { useState } from 'react';
import { Pipeline, PipelineData } from 'types/api/pipeline/def';

import PipelineListsView from '../../PipelineListsView';
import PipelinesActions from './PipelinesActions';

function PipelinePageLayout({
	refetchPipelineLists,
	pipelineData,
}: PipelinePageLayoutProps): JSX.Element {
	const [isActionType, setActionType] = useState<string>();
	const [isActionMode, setActionMode] = useState<string>('viewing-mode');
	const [savedPipelines, setSavedPipelines] = useState<Array<PipelineData>>(
		cloneDeep(pipelineData?.pipelines || []),
	);
	const [currentPipelines, setCurrentPipelines] = useState<Array<PipelineData>>(
		cloneDeep(pipelineData?.pipelines || []),
	);

	return (
		<>
			<PipelinesActions
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
				pipelineData={pipelineData}
				setCurrentPipelines={setCurrentPipelines}
			/>
			<PipelineListsView
				isActionType={String(isActionType)}
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
				savedPipelinesVersion={pipelineData?.version}
				savedPipelines={savedPipelines}
				setSavedPipelines={setSavedPipelines}
				currentPipelines={currentPipelines}
				setCurrentPipelines={setCurrentPipelines}
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
