import React, { useState } from 'react';

import AddPipelineButton from './AddPipelineButton';
import ListOfPipelines from './ListOfPipelines';
import PiplinesSearchBar from './SearchBar';

function PipelinePage(): JSX.Element {
	const [isActionType, setActionType] = useState<string>();
	return (
		<>
			<AddPipelineButton setActionType={setActionType} />
			<PiplinesSearchBar />
			<ListOfPipelines
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
export default PipelinePage;
