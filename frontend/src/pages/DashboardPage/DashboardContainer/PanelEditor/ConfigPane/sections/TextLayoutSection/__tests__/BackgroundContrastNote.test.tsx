import { render, screen } from '@testing-library/react';

import BackgroundContrastNote from '../BackgroundContrastNote';

function renderNote(color: string): HTMLElement {
	render(<BackgroundContrastNote testId="contrast" color={color} />);
	return screen.getByTestId('contrast');
}

describe('BackgroundContrastNote', () => {
	it('reports the contrast the derived ink achieves', () => {
		// The derived ink is pure white, not purple's paired ink.
		expect(renderNote('#3A2A63')).toHaveTextContent('Contrast 12.4:1');
	});

	it('warns when no ink clears the floor', () => {
		expect(renderNote('#808080')).toHaveTextContent('below the 4.5:1 minimum');
	});

	it('says nothing about the floor when the colour clears it', () => {
		expect(renderNote('#111111')).not.toHaveTextContent('below');
	});
});
