import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import 'jest-styled-components';
import SpanLength from './index';
import { v4 } from 'uuid';
import { Provider } from 'react-redux';
import store from 'store';
import { toFixed } from 'utils/toFixed';
import {
	IIntervalUnit,
	resolveTimeFromInterval,
} from 'container/TraceDetail/utils';

describe('Span Length', () => {
	it('Render without error', () => {
		const msCount = 2;

		const intervalUnit: IIntervalUnit = { multiplier: 2, name: 'm' };

		const renderComponent = render(
			<Provider store={store}>
				<SpanLength
					{...{
						bgColor: 'white',
						id: v4(),
						inMsCount: msCount,
						intervalUnit: { multiplier: 2, name: 'm' },
						leftOffset: '120',
						width: '120px',
					}}
				/>
			</Provider>,
		);

		const innerText = toFixed(resolveTimeFromInterval(msCount, intervalUnit), 2);

		const container = renderComponent.getByRole('article');

		expect(container.attributes.getNamedItem('leftoffset')?.value).toBe('120');
		expect(innerText).toBe(4);
	});
});
