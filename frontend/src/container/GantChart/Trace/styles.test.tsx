import React from 'react';
import { CardComponent } from './styles';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import 'jest-styled-components';

describe('Trace Styles', () => {
	it('Card Container in Card Component(Dark Mode)', async () => {
		const container = render(<CardComponent isDarkMode>Container</CardComponent>);

		const wrapper = await container.findByText('Container');

		expect(wrapper).toHaveStyleRule('background', '#1d1d1d');
	});

	it('Card Container in Card Component(Light Mode)', async () => {
		const container = render(
			<CardComponent isDarkMode={false}>Container</CardComponent>,
		);

		const wrapper = await container.findByText('Container');

		expect(wrapper).toHaveStyleRule('background', '#ddd');
	});
});
