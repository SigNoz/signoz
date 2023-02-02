import React from 'react';

import AddNewPipline from './AddNewPipline';
import ListOfPipelines from './ListOfPipelines';
import PiplinesSearchBar from './SearchBar';

function PipelinePage() {
	return (
		<>
			<AddNewPipline />
			<PiplinesSearchBar />
			<ListOfPipelines />
		</>
	);
}

export default PipelinePage;
