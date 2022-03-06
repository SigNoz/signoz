import SpanName from '../index';
import { render } from '@testing-library/react';
import React from 'react';
import { expect } from '@jest/globals';

describe('Span Name', () => {
	it('render Span Name', async () => {
		const response = render(
			<SpanName
				{...{
					name: 'Same Name',
					serviceName: 'Sample Service Name',
				}}
			/>,
		);

		expect(response.container).toBeDefined();
		expect(response.container).toMatchSnapshot();
	});

	it('render Span Name', async () => {
		const response = render(
			<SpanName
				{...{
					name: 'Same Name',
					serviceName: 'Sample Service Name',
				}}
			/>,
		);

		const el = response.getByText('Sample Service Name');
		expect(el.nodeName).toEqual('ARTICLE');

		console.log(el);
	});
});
