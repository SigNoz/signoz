import { render, renderHook } from '@testing-library/react';
import TraceFlameGraph from 'container/TraceFlameGraph';
import { useState } from 'react';
import { Provider } from 'react-redux';
import store from 'store';

test('loads and displays greeting', () => {
	const { rerender } = renderHook(() => useState(''));

	const { asFragment } = render(
		<Provider store={store}>
			<TraceFlameGraph
				{...{
					hoveredSpanId: '',
					intervalUnit: { multiplier: 0, name: 'm' },
					onSpanHover: rerender,
					onSpanSelect: (): void => {},
					selectedSpanId: '',
					traceMetaData: {
						globalEnd: 0,
						globalStart: 0,
						levels: 0,
						spread: 0,
						totalSpans: 0,
					},
					missingSpanTree: false,
					treeData: {
						children: [],
						id: '',
						name: '',
						serviceColour: '#a0e',
						serviceName: '',
						startTime: 0,
						tags: [],
						time: 100,
						value: 100,
						event: [],
						hasError: false,
						parent: undefined,
						spanKind: '',
						statusCodeString: '',
						statusMessage: '',
					},
				}}
			/>
		</Provider>,
	);
	expect(asFragment()).toMatchSnapshot();
});
