import { expect } from '@jest/globals';
import { render } from '@testing-library/react';
import TraceFlameGraph from 'container/TraceFlameGraph';
import React, { useState } from 'react';

test('loads and displays greeting', () => {
	const onSpanHover = useState('');

	const { asFragment } = render(
		<TraceFlameGraph
			{...{
				hoveredSpanId: '',
				intervalUnit: { multiplier: 0, name: 'm' },
				onSpanHover: onSpanHover[1],
				onSpanSelect: (): void => {},
				selectedSpanId: '',
				traceMetaData: {
					globalEnd: 0,
					globalStart: 0,
					levels: 0,
					spread: 0,
					totalSpans: 0,
				},
				treeData: {
					children: [],
					id: '',
					name: '',
					serviceColour: '',
					serviceName: '',
					startTime: 0,
					tags: [],
					time: 0,
					value: 0,
					event: [],
					hasError: false,
					parent: undefined,
				},
			}}
		/>,
	);
	expect(asFragment()).toMatchSnapshot();
});
