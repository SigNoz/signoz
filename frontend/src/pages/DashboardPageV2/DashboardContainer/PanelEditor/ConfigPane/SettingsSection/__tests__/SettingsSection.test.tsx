import { fireEvent, render, screen } from '@testing-library/react';

import SettingsSection from '../SettingsSection';

describe('SettingsSection', () => {
	it('renders an arbitrary headerAction node beside the header', () => {
		render(
			<SettingsSection
				title="Thresholds"
				headerAction={
					<button type="button" aria-label="custom action" data-testid="my-action" />
				}
			>
				<div>body</div>
			</SettingsSection>,
		);

		expect(screen.getByTestId('my-action')).toBeInTheDocument();
	});

	it('is collapsed by default: hides the body until the header is clicked', () => {
		render(
			<SettingsSection title="Thresholds">
				<div data-testid="body">body</div>
			</SettingsSection>,
		);

		expect(screen.queryByTestId('body')).not.toBeInTheDocument();

		fireEvent.click(screen.getByTestId('config-section-thresholds'));
		expect(screen.getByTestId('body')).toBeInTheDocument();
	});

	it('defers to onOpenChange when open is controlled', () => {
		const onOpenChange = jest.fn();
		const { rerender } = render(
			<SettingsSection title="Thresholds" open={false} onOpenChange={onOpenChange}>
				<div data-testid="body">body</div>
			</SettingsSection>,
		);

		expect(screen.queryByTestId('body')).not.toBeInTheDocument();
		fireEvent.click(screen.getByTestId('config-section-thresholds'));
		expect(onOpenChange).toHaveBeenCalledWith(true);

		rerender(
			<SettingsSection title="Thresholds" open onOpenChange={onOpenChange}>
				<div data-testid="body">body</div>
			</SettingsSection>,
		);
		expect(screen.getByTestId('body')).toBeInTheDocument();
	});
});
