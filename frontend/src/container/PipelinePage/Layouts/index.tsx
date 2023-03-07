import React, { useState } from 'react';

import PipelineListsView from '../PipelineListsView';
import CreatePipelineButton from './CreatePipelineButton';
import PipelinesSearchSection from './PipelinesSearchSection';

function PipelinePageLayout(): JSX.Element {
	const [isActionType, setActionType] = useState<string>();
	const [isActionMode, setActionMode] = useState<string>('viewing-mode');

	return (
		<>
			<CreatePipelineButton
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
			/>
			<PipelinesSearchSection />
			<PipelineListsView
				isActionType={String(isActionType)}
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
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

export enum ActionMode {
	Viewing = 'viewing-mode',
	Editing = 'editing-mode',
	Deploying = 'deploying-mode',
}
export default PipelinePageLayout;
