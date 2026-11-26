/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, within } from 'storybook/test';

const openTimeRangeMenu = async (): Promise<void> => {
	await userEvent.click(await screen.findByRole('textbox'));
	await screen.findByTestId('time-option-custom');
};

export const openRelativeTimes = async (): Promise<void> => {
	await openTimeRangeMenu();
	await screen.findByText('RELATIVE TIMES');
};

export const openTimezoneMenu = async (): Promise<void> => {
	await openTimeRangeMenu();
	await userEvent.click(
		await screen.findByRole('button', { name: 'Change Timezone' }),
	);
	await screen.findByPlaceholderText('Search timezones...');
};

/** The calendar loads in its own chunk, so it is awaited past the fallback. */
export const openCustomRangeCalendar = async (): Promise<void> => {
	await openTimeRangeMenu();
	await userEvent.click(screen.getByTestId('time-option-custom'));

	const calendar = await screen.findByTestId(
		'calendar-container',
		{},
		{ timeout: 10000 },
	);
	await expect(
		within(calendar).getByTestId('calendar-apply-btn'),
	).toBeInTheDocument();
};
