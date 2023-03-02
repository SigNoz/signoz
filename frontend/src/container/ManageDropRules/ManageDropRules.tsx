import React from 'react';

import ListDropRules from './ListDropRules';

function ManageDropRules(): JSX.Element {
	return (
		<ListDropRules
			rules={[
				{
					name: 'Drop Job maintenance Metrics',
					status: 'OK',
					priority: 10,
					ruleType: 'ALWAYS_ON',
				},
                {
					name: 'Drop Job maintenance Traces',
					status: 'OK',
					priority: 20,
					ruleType: 'ALWAYS_ON',
				},
			]}
		/>
	);
}

export default ManageDropRules;
