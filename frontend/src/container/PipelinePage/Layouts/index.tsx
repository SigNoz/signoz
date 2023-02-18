import { Form } from 'antd';
import React, { useState } from 'react';

import PipelineListsView from '../PipelineListsView';
import CreatePipelineButton from './CreatePipelineButton';
import PipelinesSearchSection from './PipelinesSearchSection';

function PipelinePageLayout(): JSX.Element {
	const [isActionType, setActionType] = useState<string>();
	const [addPipelineForm] = Form.useForm();
	return (
		<>
			<CreatePipelineButton
				setActionType={setActionType}
				addPipelineForm={addPipelineForm}
			/>
			<PipelinesSearchSection />
			<PipelineListsView
				isActionType={isActionType as string}
				setActionType={setActionType}
				addPipelineForm={addPipelineForm}
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
