import { expect, screen, userEvent, waitFor } from 'storybook/test';

// `Typography` counts text as cut only past this much overflow.
const TRUNCATION_TOLERANCE_PX = 1;
// Longer than the tooltip's open delay, so a tooltip that would open has opened.
const PAST_OPEN_DELAY_MS = 600;

const tooltipsHolding = (text: string): HTMLElement[] =>
	screen
		.queryAllByRole('tooltip')
		.filter((tooltip) => tooltip.textContent?.includes(text));

/**
 * Hovers a `Typography` with `textOverflow="ellipsis"` and checks its tooltip:
 * one tooltip with the full text once while the text is cut, none while it
 * fits. Nested tooltips on one trigger merge into one, so a duplicate shows as
 * the text repeated inside it; an outer antd tooltip shows as a second one.
 *
 * `cut` fails the play when the layout stops cutting the text, or starts to;
 * leave it out where a control decides the width. `label` is the Typography
 * element itself, so a `flex` Typography, whose text sits in an inner span,
 * does not fit.
 */
export const hoverTruncatableText = async (
	label: HTMLElement,
	text: string,
	{ cut }: { cut?: boolean } = {},
): Promise<void> => {
	// A width read before the font loads differs from the one `Typography` acts on.
	await document.fonts.ready;
	const isCut = label.scrollWidth - label.clientWidth > TRUNCATION_TOLERANCE_PX;
	if (cut !== undefined) {
		await expect(isCut).toBe(cut);
	}

	if (!isCut) {
		await userEvent.hover(label);
		await new Promise((resolve) => {
			setTimeout(resolve, PAST_OPEN_DELAY_MS);
		});
		await expect(tooltipsHolding(text)).toHaveLength(0);
		return;
	}

	// A hover before the text is measured finds no tooltip to open.
	await waitFor(() => expect(label).toHaveAttribute('data-truncated'));
	await userEvent.hover(label);

	await waitFor(async () => {
		await expect(tooltipsHolding(text)[0]).toBeVisible();
	});
	// antd opens after 100ms and `Typography` after 300ms, so count once both have.
	await new Promise((resolve) => {
		setTimeout(resolve, PAST_OPEN_DELAY_MS);
	});

	const tooltips = tooltipsHolding(text);
	await expect(tooltips).toHaveLength(1);
	await expect(tooltips[0].textContent?.split(text)).toHaveLength(2);
};
