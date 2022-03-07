import React from 'react';
import { render } from '@testing-library/react';
import TraceFlameGraph from 'container/TraceFlameGraph';
import { Provider } from 'react-redux';
import store from 'store';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import 'jest-styled-components';

it('loads and displays greeting', async () => {
	const { asFragment } = render(
		<Provider store={store}>
			<TraceFlameGraph
				{...{
					hoveredSpanId: '',
					intervalUnit: { multiplier: 0, name: 'm' },
					onSpanHover: () => {},
					onSpanSelect: () => {},
					selectedSpanId: '',
					traceMetaData: [],
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
					key: '',
				}}
			/>
		</Provider>,
	);
	expect(asFragment()).toMatchSnapshot();
});
