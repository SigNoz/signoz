import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import OnboardingPageV2 from './OnboardingPageV2';
import {
	onboardingV2Mocks,
	SETUP_STEPS,
	type SetupStep,
} from './OnboardingPageV2.stories.mocks';

type OnboardingV2Args = PageStoryArgs<typeof onboardingV2Mocks>;

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

const pageStory = storyMocks(onboardingV2Mocks);

/**
 * The add data source flow: pick a source, then walk its steps, with the ingestion
 * key the snippets carry.
 *
 * Route: `/get-started-with-signoz-cloud`.
 */
const meta = {
	title: 'Pages/Onboarding/Add Data Source',
	tags: ['play'],
	component: OnboardingPageV2,
	decorators: [withAppLayout],
	/**
	 * Destructuring `mount` is what makes the step control a control: Storybook
	 * re-runs a play function on an arg change only for a story that asks to be
	 * remounted, and otherwise re-renders the one it already walked.
	 */
	play: async ({ mount, args, canvasElement }): Promise<void> => {
		await mount();

		await advanceToSetupStep(canvasElement, args.step);
	},
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<OnboardingV2Args>;

export default meta;

type Story = StoryObj<OnboardingV2Args>;

/** Everything a new workspace can send data from, grouped by signal. */
export const Default: Story = {};

/** A language picked, which is where the catalogue asks what it is written with. */
export const FrameworkQuestion: Story = {
	args: { step: 'select-framework' },
};

/** The last question a source asks: where the instrumented service runs. */
export const EnvironmentQuestion: Story = {
	args: { step: 'select-environment' },
};

/** Every question answered, with the setup instructions one click away. */
export const ReadyToConfigure: Story = {
	args: { step: 'ready-to-configure' },
};

/** The setup instructions for the answered source, next to the ingestion key. */
export const ConfigureProduct: Story = {
	args: { step: 'configure-product' },
};

/** Arrived on a source already picked, which is what a docs link does. */
export const SourcePreselected: Story = {
	args: { source: 'java' },
};

/** The one thing the header offers besides support: bringing the team along. */
export const InviteTeammate: Story = {
	play: async ({ mount, args, canvasElement }): Promise<void> => {
		await mount();

		await advanceToSetupStep(canvasElement, args.step);

		await userEvent.click(
			within(canvasElement).getByRole('button', { name: /invite a teammate/i }),
		);

		// antd portals the modal out of the story root.
		await screen.findByText('Invite a team member', undefined, untilRendered);
	},
};

/** A search nothing answers, where the catalogue offers to add the source instead. */
export const NoSearchResults: Story = {
	play: async ({ mount, canvasElement }): Promise<void> => {
		await mount();

		const canvas = within(canvasElement);

		await userEvent.type(
			await canvas.findByPlaceholderText('Search', undefined, untilRendered),
			'ledger',
		);

		// The search is debounced, so the miss lands a beat after the last keystroke.
		await canvas.findByText(/no results for ledger/i, undefined, untilRendered);
	},
};
