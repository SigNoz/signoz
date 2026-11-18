import { expect, within } from 'storybook/test';

import { PANEL_NAME } from '../__story_mockdata__/constants';

import { PANEL_LOAD, type PanelPlayArgs } from './args';

export const expectText = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const panel = await within(root).findByTestId('text-panel', {}, PANEL_LOAD);
	const body = within(panel);

	await expect(
		body.getByRole('heading', { name: 'Checkout runbook' }),
	).toBeInTheDocument();
	await expect(body.getAllByRole('listitem')).toHaveLength(3);
	await expect(
		body.getByRole('link', { name: 'payments dashboard' }),
	).toBeInTheDocument();
	await expect(panel.querySelector('pre code')).toHaveTextContent(
		'kubectl scale',
	);

	await expect(getComputedStyle(panel).textAlign).toBe(args.textAlign);

	await expect(within(root).getByText(PANEL_NAME.Text)).toBeInTheDocument();
};
