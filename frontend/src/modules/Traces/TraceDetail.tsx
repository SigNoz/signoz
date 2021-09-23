import React from 'react';

import { TraceCustomVisualizations } from './TraceCustomVisualizations';
import { TraceFilter } from './TraceFilter';
import { TraceList } from './TraceList';

const TraceDetail = (): JSX.Element => {
	return (
		<>
			<TraceFilter />
			<TraceCustomVisualizations />
			<TraceList />
		</>
	);
};

export default TraceDetail;
