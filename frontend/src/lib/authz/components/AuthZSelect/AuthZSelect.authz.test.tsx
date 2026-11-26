import { TooltipProvider } from '@signozhq/ui/tooltip';
import { render, screen, userEvent, within } from 'tests/test-utils';

import AuthZSelect from './AuthZSelect';
import type { AuthZSelectOption } from './types';

const DENIAL =
	'user/u-1 is not authorized to perform detach:notification-channel:locked';

const option = (
	value: string,
	access: Partial<AuthZSelectOption> = {},
): AuthZSelectOption => ({
	value,
	label: value,
	disabled: false,
	denied: false,
	testId: `option-${value}`,
	...access,
});

const OPTIONS = [
	option('open'),
	option('pending', { disabled: true, reason: 'Checking permissions' }),
	option('locked-channel', { disabled: true, reason: DENIAL, denied: true }),
];

const renderSelect = (value: string[] = []): void => {
	render(
		<TooltipProvider delay={0}>
			<AuthZSelect
				data-testid="picker"
				options={OPTIONS}
				value={value}
				maxTagTextLength={6}
			/>
		</TooltipProvider>,
	);
};

const openPicker = async (
	user: ReturnType<typeof userEvent.setup>,
): Promise<void> => {
	await user.click(within(screen.getByTestId('picker')).getByRole('combobox'));
};

describe('AuthZSelect', () => {
	it('names why each locked option is locked, and no reason for the others', async () => {
		const user = userEvent.setup();
		renderSelect();
		await openPicker(user);

		const locked = await screen.findByTestId('option-locked-channel');
		expect(locked).toHaveAttribute('aria-disabled', 'true');
		expect(locked).toHaveAttribute('aria-description', DENIAL);
		expect(screen.getByTestId('option-pending')).toHaveAttribute(
			'aria-description',
			'Checking permissions',
		);
		expect(screen.getByTestId('option-open')).not.toHaveAttribute(
			'aria-description',
		);
	});

	it('shows the denial when hovering a locked option', async () => {
		const user = userEvent.setup();
		renderSelect();
		await openPicker(user);

		await user.hover(
			within(await screen.findByTestId('option-locked-channel')).getByText(
				'locked-channel',
			),
		);

		await expect(screen.findByText(DENIAL)).resolves.toBeInTheDocument();
	});

	it('shows the denial when hovering a locked tag, truncated like the others', async () => {
		const user = userEvent.setup();
		renderSelect(['locked-channel']);

		await user.hover(screen.getByText('locked...'));

		await expect(screen.findByText(DENIAL)).resolves.toBeInTheDocument();
	});
});
