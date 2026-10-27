/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, within } from 'storybook/test';

import { PANEL_NAME } from '../__story_mockdata__/constants';

import { PANEL_LOAD, type PanelPlayArgs } from './args';

const TEXT_ALIGN_CSS: Record<string, string> = {
	left: 'left',
	center: 'center',
	right: 'right',
};

export const expectText = async (
	root: HTMLElement,
	args: PanelPlayArgs,
): Promise<void> => {
	const panel = await within(root).findByTestId('text-panel', {}, PANEL_LOAD);
	const body = within(panel);

	if (args.textSample === 'runbook') {
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
	} else if (args.textSample === 'note') {
		await expect(panel.querySelector('strong')).toHaveTextContent('checkout');
	} else {
		await expect(body.getByTestId('text-panel-empty')).toBeInTheDocument();
	}

	await expect(getComputedStyle(panel).textAlign).toBe(
		TEXT_ALIGN_CSS[args.textAlign],
	);

	const title = within(root).queryByText(PANEL_NAME.Text);
	if (args.hideHeader) {
		await expect(title).toBeNull();
		await expect(
			within(root).getByTestId('hidden-header-drag-handle'),
		).toBeInTheDocument();
	} else {
		await expect(title).toBeInTheDocument();
	}
};
