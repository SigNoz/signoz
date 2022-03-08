import { expect } from '@jest/globals';
import React from 'react';
import { render } from '@testing-library/react';
import TraceFlameGraph from 'container/TraceFlameGraph';

test('loads and displays greeting', async () => {
	const { asFragment } = render(<TraceFlameGraph />);
	expect(asFragment()).toMatchSnapshot();
});
