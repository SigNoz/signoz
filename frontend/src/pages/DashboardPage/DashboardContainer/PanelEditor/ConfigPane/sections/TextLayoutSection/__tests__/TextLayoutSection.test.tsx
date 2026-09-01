import { fireEvent, render, screen } from '@testing-library/react';
import {
	DashboardtypesPanelBackgroundDTO,
	DashboardtypesTextAlignDTO,
	DashboardtypesVerticalAlignDTO,
} from 'api/generated/services/sigNoz.schemas';

import TextLayoutSection from '../TextLayoutSection';

const value = {
	textAlign: DashboardtypesTextAlignDTO.left,
	verticalAlign: DashboardtypesVerticalAlignDTO.top,
	background: DashboardtypesPanelBackgroundDTO.solid,
};

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

	it('toggles the transparent background', () => {
		const onChange = jest.fn();
		render(<TextLayoutSection value={value} onChange={onChange} />);

		fireEvent.click(screen.getByTestId('text-layout-transparent'));

		expect(onChange).toHaveBeenCalledWith({
			...value,
			background: DashboardtypesPanelBackgroundDTO.transparent,
		});
	});

	it('defaults to left/top/solid when the slice is empty', () => {
		render(<TextLayoutSection value={undefined} onChange={jest.fn()} />);

		expect(screen.getByTestId('text-layout-horizontal-align')).toBeInTheDocument();
		expect(screen.getByTestId('text-layout-transparent')).not.toBeChecked();
	});
});
