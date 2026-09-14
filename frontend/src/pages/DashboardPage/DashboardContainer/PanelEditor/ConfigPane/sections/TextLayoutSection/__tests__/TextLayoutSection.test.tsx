import type { ReactElement } from 'react';
import {
	fireEvent,
	render as rtlRender,
	type RenderResult,
	screen,
} from '@testing-library/react';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import {
	DashboardtypesTextAlignDTO,
	DashboardtypesVerticalAlignDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	TEXT_BACKGROUND_PAIRS,
	TRANSPARENT_BACKGROUND,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/presets';

import TextLayoutSection from '../TextLayoutSection';

const value = {
	textAlign: DashboardtypesTextAlignDTO.left,
	verticalAlign: DashboardtypesVerticalAlignDTO.top,
};

// The swatch tooltips need a provider; AppLayout supplies one at runtime.
function render(ui: ReactElement): RenderResult {
	return rtlRender(<TooltipProvider>{ui}</TooltipProvider>);
}

// The theme context defaults to dark, so the swatches paint the dark pairs.
describe('TextLayoutSection', () => {
	it('changes horizontal alignment', () => {
		const onChange = jest.fn();
		render(<TextLayoutSection value={value} onChange={onChange} />);

		fireEvent.click(screen.getByText('Center'));

		expect(onChange).toHaveBeenCalledWith({
			...value,
			textAlign: DashboardtypesTextAlignDTO.center,
		});
	});

	it('changes vertical alignment', () => {
		const onChange = jest.fn();
		render(<TextLayoutSection value={value} onChange={onChange} />);

		fireEvent.click(screen.getByText('Bottom'));

		expect(onChange).toHaveBeenCalledWith({
			...value,
			verticalAlign: DashboardtypesVerticalAlignDTO.bottom,
		});
	});

	it('stores the surface of the theme a preset was picked in', () => {
		const onChange = jest.fn();
		render(<TextLayoutSection value={value} onChange={onChange} />);

		fireEvent.click(screen.getByRole('radio', { name: 'Amber' }));

		expect(onChange).toHaveBeenCalledWith({
			...value,
			background: TEXT_BACKGROUND_PAIRS.amber.dark.surface,
		});
	});

	it('stores a zero-alpha colour for transparent', () => {
		const onChange = jest.fn();
		render(<TextLayoutSection value={value} onChange={onChange} />);

		fireEvent.click(screen.getByRole('radio', { name: 'Transparent' }));

		expect(onChange).toHaveBeenCalledWith({
			...value,
			background: TRANSPARENT_BACKGROUND,
		});
	});

	it('unsets the background for the default panel surface', () => {
		const onChange = jest.fn();
		render(
			<TextLayoutSection
				value={{ ...value, background: TRANSPARENT_BACKGROUND }}
				onChange={onChange}
			/>,
		);

		fireEvent.click(screen.getByRole('radio', { name: 'Default panel' }));

		expect(onChange).toHaveBeenCalledWith({ ...value, background: undefined });
	});

	it('lights up the swatch the stored surface belongs to', () => {
		render(
			<TextLayoutSection
				value={{ ...value, background: TEXT_BACKGROUND_PAIRS.sakura.light.surface }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByRole('radio', { name: 'Sakura' })).toBeChecked();
	});

	it('stores a custom colour straight from the picker', () => {
		const onChange = jest.fn();
		render(<TextLayoutSection value={value} onChange={onChange} />);

		fireEvent.click(screen.getByTestId('text-layout-background-custom'));
		fireEvent.change(screen.getByRole('textbox'), {
			target: { value: '3A2A64' },
		});

		expect(onChange).toHaveBeenCalledWith({
			...value,
			background: '#3a2a64',
		});
	});

	it('shows a stored custom colour on the custom row alone', () => {
		render(
			<TextLayoutSection
				value={{ ...value, background: '#3A2A64' }}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('text-layout-background-custom')).toHaveTextContent(
			'#3A2A64',
		);
		expect(
			screen
				.getAllByRole<HTMLInputElement>('radio')
				.filter((swatch) => swatch.checked),
		).toHaveLength(0);
	});

	it('selects the default surface when nothing is stored', () => {
		render(<TextLayoutSection value={undefined} onChange={jest.fn()} />);

		expect(screen.getByRole('radio', { name: 'Default panel' })).toBeChecked();
		expect(screen.getByRole('radio', { name: 'Transparent' })).not.toBeChecked();
	});
});
