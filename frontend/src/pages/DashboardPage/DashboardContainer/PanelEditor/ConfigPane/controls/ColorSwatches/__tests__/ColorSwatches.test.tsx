import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@signozhq/ui/tooltip';

import ColorSwatches, { type ColorSwatchOption } from '../ColorSwatches';

const OPTIONS: ColorSwatchOption<string>[] = [
	{ value: 'none', id: 'none', label: 'Transparent', pattern: 'transparent' },
	{
		value: 'default',
		id: 'default',
		label: 'Default panel',
		tooltip: 'Default panel colour',
		pattern: 'surface',
	},
	{ value: '#ff0000', id: 'red', label: 'Red', fill: '#ff0000' },
	{ value: '#00ff00', id: 'green', label: 'Green', fill: '#00ff00' },
];

function renderSwatches(
	props: Partial<React.ComponentProps<typeof ColorSwatches<string>>> = {},
): { onChange: jest.Mock; onCustom: jest.Mock } {
	const onChange = jest.fn();
	const onCustom = jest.fn();
	render(
		<TooltipProvider>
			<ColorSwatches
				testId="color"
				label="Color"
				value="default"
				options={OPTIONS}
				dividerAfter={1}
				onChange={onChange}
				custom={{
					value: undefined,
					initial: '#3A2A63',
					onChange: onCustom,
					pickerFooter: (hex) => <span data-testid="footer">{hex}</span>,
				}}
				{...props}
			/>
		</TooltipProvider>,
	);
	return { onChange, onCustom };
}

describe('ColorSwatches', () => {
	it('is one labelled radio group, in option order', () => {
		renderSwatches();

		expect(screen.getByRole('radiogroup', { name: 'Color' })).toBeInTheDocument();
		expect(
			screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label')),
		).toStrictEqual(['Transparent', 'Default panel', 'Red', 'Green']);
	});

	it('paints each swatch its fill', () => {
		renderSwatches();

		expect(screen.getByTestId('color-red')).toHaveStyle({
			background: '#ff0000',
		});
	});

	it('checks only the selected swatch', () => {
		renderSwatches({ value: '#00ff00' });

		expect(screen.getByRole('radio', { name: 'Green' })).toBeChecked();
		expect(screen.getByRole('radio', { name: 'Red' })).not.toBeChecked();
	});

	it('reports the swatch that was clicked', async () => {
		const user = userEvent.setup();
		const { onChange } = renderSwatches();

		await user.click(screen.getByRole('radio', { name: 'Red' }));

		expect(onChange).toHaveBeenCalledWith('#ff0000');
	});

	it.each([
		['color-default', 'Default panel colour'],
		['color-red', 'Red'],
	])('explains %s on hover', async (swatchId, copy) => {
		const user = userEvent.setup();
		renderSwatches();

		await user.hover(screen.getByTestId(swatchId));

		await waitFor(() => {
			expect(screen.getByRole('tooltip')).toHaveTextContent(copy);
		});
	});

	describe('the custom swatch', () => {
		it('is pressed only while a custom color is active', () => {
			renderSwatches();
			expect(screen.getByTestId('color-custom')).toHaveAttribute(
				'aria-pressed',
				'false',
			);
		});

		it('names the active custom color', () => {
			renderSwatches({
				value: undefined,
				custom: { value: '#3a2a64', initial: '#000000', onChange: jest.fn() },
			});

			expect(
				screen.getByRole('button', { name: 'Custom #3A2A64' }),
			).toHaveAttribute('aria-pressed', 'true');
		});

		it('opens a picker with the footer, starting from the initial color', async () => {
			const user = userEvent.setup();
			renderSwatches();

			await user.click(screen.getByTestId('color-custom'));

			expect(screen.getByTestId('footer')).toHaveTextContent('#3A2A63');
		});

		it('reports the color picked', async () => {
			const user = userEvent.setup();
			const { onCustom } = renderSwatches();

			await user.click(screen.getByTestId('color-custom'));
			await user.clear(screen.getByRole('textbox'));
			await user.type(screen.getByRole('textbox'), '3A2A64');

			expect(onCustom).toHaveBeenCalledWith('#3a2a64');
		});
	});
});
