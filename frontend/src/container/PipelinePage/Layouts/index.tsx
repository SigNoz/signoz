import React, { useState } from 'react';
import { SuccessResponse } from 'types/api';
import { PipelineResponse } from 'types/api/pipeline/def';

import PipelineListsView from '../PipelineListsView';
import CreatePipelineButton from './CreatePipelineButton';
import PipelinesSearchSection from './PipelinesSearchSection';

function PipelinePageLayout({
	refetchPipelineLists,
	piplineData,
}: PipelinePageLayoutProps): JSX.Element {
	const [isActionType, setActionType] = useState<string>();
	const [isActionMode, setActionMode] = useState<string>('viewing-mode');

	return (
		<>
			<CreatePipelineButton
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
				piplineData={piplineData.payload}
			/>
			<PipelinesSearchSection />
			<PipelineListsView
				isActionType={String(isActionType)}
				setActionType={setActionType}
				setActionMode={setActionMode}
				isActionMode={isActionMode}
				piplineData={piplineData.payload}
				refetchPipelineLists={refetchPipelineLists}
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

interface PipelinePageLayoutProps {
	refetchPipelineLists: VoidFunction;
	piplineData: SuccessResponse<PipelineResponse>;
}

export default PipelinePageLayout;
