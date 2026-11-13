/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	onboardingV2Mocks,
	SETUP_STEPS,
	type SetupStep,
} from '../OnboardingPageV2.stories.mocks';

type OnboardingV2Args = PageStoryArgs<typeof onboardingV2Mocks>;

interface PlayContext {
	mount: () => Promise<unknown>;
	args: OnboardingV2Args;
	canvasElement: HTMLElement;
}

type Canvas = ReturnType<typeof within>;

/** The catalogue mounts before the first group of sources paints. */
const untilRendered = { timeout: 15_000 };

/**
 * Every option is a button wrapping its own logo, so the accessible name carries
 * the label twice and matches the other sources with the label as a prefix
 * (`Java`, `JavaScript`). The label's own text node is the one thing that is
 * exact.
 */
const chooseOption = async (canvas: Canvas, label: string): Promise<void> => {
	const option = await canvas.findByText(label, undefined, untilRendered);

	await userEvent.click(option.closest('button') as HTMLElement);
};

const answerDataSource = (canvas: Canvas): Promise<void> =>
	chooseOption(canvas, 'Java');

const answerFramework = (canvas: Canvas): Promise<void> =>
	chooseOption(canvas, 'Spring Boot');

const answerEnvironment = (canvas: Canvas): Promise<void> =>
	chooseOption(canvas, 'VM');

const openConfigureProduct = async (canvas: Canvas): Promise<void> => {
	await userEvent.click(
		await canvas.findByRole(
			'button',
			{ name: /configure your product/i },
			untilRendered,
		),
	);
};

const ANSWER_STEP = [
	answerDataSource,
	answerFramework,
	answerEnvironment,
	openConfigureProduct,
];

const advanceToSetupStep = async (
	canvasElement: HTMLElement,
	step: SetupStep,
): Promise<void> => {
	const canvas = within(canvasElement);

	// A source that arrived through the param is already on the setup
	// instructions, with no question left to answer.
	if (!canvas.queryByText('Select your data source')) {
		return;
	}

	const answers = ANSWER_STEP.slice(0, SETUP_STEPS.indexOf(step));

	// Sequential: each answer is what renders the question the next one reads.
	await answers.reduce(
		(walked, answer) => walked.then(() => answer(canvas)),
		Promise.resolve(),
	);
};

/**
 * Destructuring `mount` is what makes the step control a control: Storybook
 * re-runs a play function on an arg change only for a story that asks to be
 * remounted, and otherwise re-renders the one it already walked.
 */
export const walkToStep = async ({
	mount,
	args,
	canvasElement,
}: PlayContext): Promise<void> => {
	await mount();

	await advanceToSetupStep(canvasElement, args.step);
};

export const openInviteModal = async ({
	mount,
	args,
	canvasElement,
}: PlayContext): Promise<void> => {
	await mount();

	await advanceToSetupStep(canvasElement, args.step);

	await userEvent.click(
		within(canvasElement).getByRole('button', { name: /invite a teammate/i }),
	);

	// antd portals the modal out of the story root.
	await screen.findByText('Invite a team member', undefined, untilRendered);
};

export const searchWithoutResults = async ({
	mount,
	canvasElement,
}: PlayContext): Promise<void> => {
	await mount();

	const canvas = within(canvasElement);

	await userEvent.type(
		await canvas.findByPlaceholderText('Search', undefined, untilRendered),
		'ledger',
	);

	// The search is debounced, so the miss lands a beat after the last keystroke.
	await canvas.findByText(/no results for ledger/i, undefined, untilRendered);
};

export const sendInvite = async ({
	mount,
	args,
	canvasElement,
}: PlayContext): Promise<void> => {
	await mount();

	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: /invite a teammate/i },
			untilRendered,
		),
	);

	const dialog = await screen.findByRole('dialog', undefined, untilRendered);
	const [email] = await within(dialog).findAllByTestId(
		/^invite-email-.+-field$/,
		undefined,
		untilRendered,
	);

	await userEvent.type(email, 'jon@winterfell.dev');
	const [roles] = await within(dialog).findAllByRole('combobox');

	await userEvent.click(roles);
	await userEvent.click(
		await screen.findByRole('option', { name: 'viewer' }, untilRendered),
	);

	// A multi-select keeps its list open after a pick, over the Send Invites button.
	await userEvent.keyboard('{Escape}');
	await waitFor(() => expect(roles).toHaveAttribute('aria-expanded', 'false'));
	await userEvent.click(
		await within(dialog).findByRole('button', { name: /send invites/i }),
	);

	if (args.invite === 'success') {
		await waitFor(
			() => expect(screen.getByText(/invites sent successfully/i)).toBeVisible(),
			{ timeout: 5_000 },
		);
	}
};

/** Banners that turn the cloud license into a self-hosted one. */
const SELF_HOSTED_BANNERS: readonly OnboardingV2Args['banner'][] = [
	'license-expired',
	'license-terminated',
];

/** Only a cloud workspace without premium support is offered the card. */
const offersAddCard = (args: OnboardingV2Args): boolean =>
	args.support === 'add-card' &&
	args.license === 'cloud' &&
	!SELF_HOSTED_BANNERS.includes(args.banner);

const ADD_CARD_DIALOG = { name: /Add Credit Card for Chat Support/i };

export const openAddCreditCard = async ({
	mount,
	args,
	canvasElement,
}: PlayContext): Promise<void> => {
	await mount();

	const canvas = within(canvasElement);

	if (!offersAddCard(args)) {
		await canvas.findByRole(
			'button',
			{ name: /invite a teammate/i },
			untilRendered,
		);
		await expect(
			screen.queryByRole('dialog', ADD_CARD_DIALOG),
		).not.toBeInTheDocument();

		return;
	}

	await userEvent.click(
		await canvas.findByRole(
			'button',
			{ name: /contact support/i },
			untilRendered,
		),
	);

	// antd portals the modal out of the story root.
	await screen.findByRole('dialog', ADD_CARD_DIALOG, untilRendered);
};
