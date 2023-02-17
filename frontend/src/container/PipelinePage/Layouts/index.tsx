import React, { useState } from 'react';

import PipelineListsView from '../PipelineListsView';
import CreatePipelineButton from './CreatePipelineButton';
import PipelinesSearchSection from './PipelinesSearchSection';

function PipelinePageLayout(): JSX.Element {
	const [isActionType, setActionType] = useState<string>();
	return (
		<>
			<CreatePipelineButton setActionType={setActionType} />
			<PipelinesSearchSection />
			<PipelineListsView
				isActionType={isActionType as string}
				setActionType={setActionType}
			/>
		</>
	);
}

export enum ActionType {
	AddPipeline = 'add-pipeline',
	EditPipeline = 'edit-pipeline',
	AddProcessor = 'add-processor',
	EditProcessor = 'edit-processor',
}
export default PipelinePageLayout;
