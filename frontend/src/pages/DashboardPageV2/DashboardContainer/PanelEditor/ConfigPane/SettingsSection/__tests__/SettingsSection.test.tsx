import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SettingsSection from '../SettingsSection';

describe('SettingsSection', () => {
	it('renders an arbitrary headerSlot node beside the header', () => {
		render(
			<SettingsSection
				title="Thresholds"
				headerSlot={
					<button type="button" aria-label="custom action" data-testid="my-action" />
				}
			>
				<div>body</div>
			</SettingsSection>,
		);

		expect(screen.getByTestId('my-action')).toBeInTheDocument();
	});

	it('is collapsed by default: hides the body until the header is clicked', async () => {
		const user = userEvent.setup();
		render(
			<SettingsSection title="Thresholds">
				<div data-testid="body">body</div>
			</SettingsSection>,
		);

		expect(screen.queryByTestId('body')).not.toBeInTheDocument();

		await user.click(screen.getByTestId('config-section-thresholds'));
		expect(screen.getByTestId('body')).toBeInTheDocument();
	});

	it('defers to onOpenChange when open is controlled', async () => {
		const user = userEvent.setup();
		const onOpenChange = jest.fn();
		const { rerender } = render(
			<SettingsSection title="Thresholds" open={false} onOpenChange={onOpenChange}>
				<div data-testid="body">body</div>
			</SettingsSection>,
		);

		expect(screen.queryByTestId('body')).not.toBeInTheDocument();
		await user.click(screen.getByTestId('config-section-thresholds'));
		expect(onOpenChange).toHaveBeenCalledWith(true);

		rerender(
			<SettingsSection title="Thresholds" open onOpenChange={onOpenChange}>
				<div data-testid="body">body</div>
			</SettingsSection>,
		);
		expect(screen.getByTestId('body')).toBeInTheDocument();
	});
});
