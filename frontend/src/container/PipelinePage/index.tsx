import React, { useState } from 'react';

import AddPipelineButton from './AddPipelineButton';
import ListOfPipelines from './ListOfPipelines';
import PiplinesSearchBar from './SearchBar';

function PipelinePage(): JSX.Element {
	const [isActionType, setActionType] = useState<string | undefined>(undefined);
	return (
		<>
			<AddPipelineButton setActionType={setActionType} />
			<PiplinesSearchBar />
			<ListOfPipelines isActionType={isActionType} setActionType={setActionType} />
		</>
	);
}

export default PipelinePage;
