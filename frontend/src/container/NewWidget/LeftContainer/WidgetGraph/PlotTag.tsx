import React from 'react';
import { EQueryType } from 'types/common/dashboard';

import QueryTypeTag from '../QueryTypeTag';

function PlotTag({ queryType }: { queryType: EQueryType }): JSX.Element | null {
	if (queryType === undefined) {
		return null;
	}

	return (
		<div style={{ marginLeft: '2rem', position: 'absolute', top: '1rem' }}>
			Plotted using <QueryTypeTag queryType={queryType} />
		</div>
	);
}

export default PlotTag;
