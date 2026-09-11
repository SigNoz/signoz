import { fireEvent, render, screen } from '@testing-library/react';

import CustomBackgroundRow from '../CustomBackgroundRow';

function renderRow(value?: string): jest.Mock {
	const onChange = jest.fn();
	render(
		<CustomBackgroundRow testId="custom" value={value} onChange={onChange} />,
	);
	return onChange;
}

describe('CustomBackgroundRow', () => {
	it('stands in for the hex while no custom colour is set', () => {
		renderRow();

		expect(screen.getByTestId('custom')).toHaveTextContent('#______');
	});

	it('shows the stored hex once one is set', () => {
		renderRow('#3A2A63');

		expect(screen.getByTestId('custom')).toHaveTextContent('#3A2A63');
	});

	it('checks the chip only while the custom colour is the selection', () => {
		renderRow('#3A2A63');

		expect(screen.getByTestId('custom').querySelector('svg')).toBeInTheDocument();
	});

	it('leaves the chip unchecked while no custom colour is set', () => {
		renderRow();

		expect(screen.getByTestId('custom').querySelectorAll('svg')).toHaveLength(1);
	});

	describe('the picker', () => {
		it('opens on the row', () => {
			renderRow('#3A2A63');

			fireEvent.click(screen.getByTestId('custom'));

			expect(screen.getByTestId('custom-contrast')).toBeInTheDocument();
		});

		it('reports the contrast the colour achieves', () => {
			renderRow('#3A2A63');

			fireEvent.click(screen.getByTestId('custom'));

			// The derived ink is pure white, not purple's paired ink.
			expect(screen.getByTestId('custom-contrast')).toHaveTextContent(
				'Contrast 12.4:1',
			);
		});

		it('warns when no ink clears the floor, without disabling anything', () => {
			renderRow('#808080');

			fireEvent.click(screen.getByTestId('custom'));

			expect(screen.getByTestId('custom-contrast')).toHaveTextContent(
				'below 4.5:1',
			);
			expect(screen.getByTestId('custom')).toBeEnabled();
		});

		it('says nothing about the floor when the colour clears it', () => {
			renderRow('#111111');

			fireEvent.click(screen.getByTestId('custom'));

			expect(screen.getByTestId('custom-contrast')).not.toHaveTextContent('below');
		});
	});
});
