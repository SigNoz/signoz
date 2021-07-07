import React from 'react';
import { TraceCustomVisualizations } from './TraceCustomVisualizations';
import { TraceFilter } from './TraceFilter';
import { TraceList } from './TraceList';

const TraceDetail = () => {
	return (
		<div>
			<TraceFilter />
			<TraceCustomVisualizations />
			<TraceList />
		</div>
	);
};

export default TraceDetail;
