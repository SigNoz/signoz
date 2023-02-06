import React, { useState } from 'react';

import AddNewPipline from './AddNewPipline';
import ListOfPipelines from './ListOfPipelines';
import PiplinesSearchBar from './SearchBar';

function PipelinePage(): JSX.Element {
	const [isActionType, setActionType] = useState<string | undefined>(undefined);
	return (
		<>
			<AddNewPipline setActionType={setActionType} />
			<PiplinesSearchBar />
			<ListOfPipelines isActionType={isActionType} setActionType={setActionType} />
		</>
	);
}

export default PipelinePage;
