import { expect } from '@jest/globals';
import { render } from '@testing-library/react';
import TraceFlameGraph from 'container/TraceFlameGraph';
import React from 'react';

test('loads and displays greeting', async () => {
	const { asFragment } = render(<TraceFlameGraph />);
	expect(asFragment()).toMatchSnapshot();
});
