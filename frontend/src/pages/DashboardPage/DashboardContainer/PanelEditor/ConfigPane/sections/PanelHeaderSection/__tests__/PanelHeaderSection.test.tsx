import { fireEvent, render, screen } from '@testing-library/react';

import PanelHeaderSection from '../PanelHeaderSection';

describe('PanelHeaderSection', () => {
	it('toggles hide on', () => {
		const onChange = jest.fn();
		render(<PanelHeaderSection value={undefined} onChange={onChange} />);

		fireEvent.click(screen.getByTestId('panel-header-hide'));

		expect(onChange).toHaveBeenCalledWith({ hide: true });
	});

	it('toggles hide back off', () => {
		const onChange = jest.fn();
		render(<PanelHeaderSection value={{ hide: true }} onChange={onChange} />);

		fireEvent.click(screen.getByTestId('panel-header-hide'));

		expect(onChange).toHaveBeenCalledWith({ hide: false });
	});

	it('shows the header by default when the slice is empty', () => {
		render(<PanelHeaderSection value={undefined} onChange={jest.fn()} />);

		expect(screen.getByTestId('panel-header-hide')).not.toBeChecked();
	});
});
