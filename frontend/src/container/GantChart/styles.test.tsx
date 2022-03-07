import React from 'react';
import { CardContainer } from './styles';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';
import 'jest-styled-components';

describe('Gant Chart Styles', () => {
	it('Card Container', async () => {
		const container = render(<CardContainer>Container</CardContainer>);

		const wrapper = await container.findByText('Container');

		expect(wrapper).not.toBeUndefined();
		expect(wrapper.className).not.toBe('');
		expect(wrapper).toHaveStyleRule('display', 'flex');
		expect(wrapper).toHaveStyleRule('width', '100%');
	});
});
