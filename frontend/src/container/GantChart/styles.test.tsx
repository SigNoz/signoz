import React from 'react';
import { CardContainer } from './styles';
import { render } from '@testing-library/react';
import { expect } from '@jest/globals';

describe('Gant Chart Styles', () => {
	it('Card Container', async () => {
		const container = render(<CardContainer>Container</CardContainer>);

		const wrapper = await container.findByText('Container');

		expect(wrapper).not.toBeUndefined();
		expect(wrapper.className).not.toBe('');
	});
});
