import { useState } from 'react';
import { Pipeline } from 'types/api/pipeline/def';

import PipelineListsView from '../../PipelineListsView';
import CreatePipelineButton from './CreatePipelineButton';
import PipelinesSearchSection from './PipelinesSearchSection';

function PipelinePageLayout({
	refetchPipelineLists,
	pipelineData,
}: PipelinePageLayoutProps): JSX.Element {
	const [isActionType, setActionType] = useState<string>();
	const [isActionMode, setActionMode] = useState<string>('viewing-mode');
	const [pipelineSearchValue, setPipelineSearchValue] = useState<string>('');

	return (
		<>
			<CreatePipelineButton
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
				pipelineData={pipelineData}
			/>
			<PipelinesSearchSection setPipelineSearchValue={setPipelineSearchValue} />
			<PipelineListsView
				isActionType={String(isActionType)}
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
				pipelineData={pipelineData}
				refetchPipelineLists={refetchPipelineLists}
				pipelineSearchValue={pipelineSearchValue}
			/>
		</>
	);
}

interface PipelinePageLayoutProps {
	refetchPipelineLists: VoidFunction;
	pipelineData: Pipeline;
}

export default PipelinePageLayout;
