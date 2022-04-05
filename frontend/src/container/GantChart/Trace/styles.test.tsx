import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';

import { expect } from '@jest/globals';
import { render } from '@testing-library/react';
import React from 'react';

import { CardComponent } from './styles';

describe('Trace Styles', () => {
	it('Card Container in Card Component(Dark Mode)', async () => {
		const container = render(
			<CardComponent isOnlyChild isDarkMode>
				Container
			</CardComponent>,
		);

		const wrapper = await container.findByText('Container');

		expect(wrapper).toHaveStyleRule('background', '#1d1d1d');
	});

	it('Card Container in Card Component(Light Mode)', async () => {
		const container = render(
			<CardComponent isOnlyChild isDarkMode={false}>
				Container
			</CardComponent>,
		);

		const wrapper = await container.findByText('Container');

		expect(wrapper).toHaveStyleRule('background', '#ddd');
	});
});
