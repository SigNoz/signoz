import { Tag } from 'antd';
import React, { useCallback } from 'react';
import { EQueryType } from 'types/common/dashboard';

import QueryTypeTag from '../QueryTypeTag';

function PlotTag({ queryType }) {
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
