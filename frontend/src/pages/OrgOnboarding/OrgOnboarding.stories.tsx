import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import OrgOnboarding from './OrgOnboarding';
import {
	orgOnboardingMocks,
	QUESTIONNAIRE_PAGES,
	type QuestionnairePage,
} from './OrgOnboarding.stories.mocks';

type OrgOnboardingArgs = PageStoryArgs<typeof orgOnboardingMocks>;

type Canvas = ReturnType<typeof within>;

/** The provider tree mounts before the first question paints. */
const untilRendered = { timeout: 15_000 };

const clickNext = async (canvas: Canvas): Promise<void> => {
	await userEvent.click(canvas.getByRole('button', { name: /next/i }));
};

/** Starting fresh with no OpenTelemetry: the shortest answer Next accepts. */
const answerAboutYourOrg = async (canvas: Canvas): Promise<void> => {
	await userEvent.click(
		await canvas.findByRole(
			'radio',
			{ name: 'None/Starting fresh' },
			untilRendered,
		),
	);
	await userEvent.click(canvas.getByRole('radio', { name: 'No' }));
	await clickNext(canvas);
};

const answerAboutSignoz = async (canvas: Canvas): Promise<void> => {
	await userEvent.type(
		await canvas.findByRole('textbox', undefined, untilRendered),
		'A colleague mentioned it',
	);
	await userEvent.click(
		canvas.getByRole('checkbox', { name: 'Lowering observability costs' }),
	);
	await clickNext(canvas);
};

/** Next stays disabled until a slider moves; doing it later sends the same zeroes. */
const answerYourScale = async (canvas: Canvas): Promise<void> => {
	await userEvent.click(
		await canvas.findByRole('button', { name: /do this later/i }, untilRendered),
	);
};

const ANSWER_PAGE = [answerAboutYourOrg, answerAboutSignoz, answerYourScale];

const advanceToQuestionnairePage = async (
	canvasElement: HTMLElement,
	page: QuestionnairePage,
): Promise<void> => {
	const canvas = within(canvasElement);
	const answers = ANSWER_PAGE.slice(0, QUESTIONNAIRE_PAGES.indexOf(page));

	// Sequential: each answer is what renders the page the next one reads.
	await answers.reduce(
		(walked, answer) => walked.then(() => answer(canvas)),
		Promise.resolve(),
	);
};

const pageStory = storyMocks(orgOnboardingMocks);

/**
 * The org onboarding questionnaire, page by page, before the workspace has data.
 *
 * Route: `/onboarding`.
 */
const meta = {
	title: 'Pages/Onboarding/Questionnaire',
	tags: ['play'],
	component: OrgOnboarding,
	decorators: [withAppLayout],
	/**
	 * Destructuring `mount` is what makes the page control a control: Storybook
	 * re-runs a play function on an arg change only for a story that asks to be
	 * remounted, and otherwise re-renders the one it already walked.
	 */
	play: async ({ mount, args, canvasElement }): Promise<void> => {
		await mount();

		await advanceToQuestionnairePage(canvasElement, args.page);
	},
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<OrgOnboardingArgs>;

export default meta;

type Story = StoryObj<OrgOnboardingArgs>;

/** The first thing a new organisation sees, before any data is sent. */
export const Default: Story = {};

/** Why the workspace is here: how they found SigNoz, and what they came for. */
export const AboutSigNoz: Story = {
	args: { page: 'about-signoz' },
};

/** The scale the workspace expects, which is what sizes the plan they are offered. */
export const YourScale: Story = {
	args: { page: 'your-scale' },
};

/** The last page, where the workspace is opened up to the rest of the team. */
export const InviteTeam: Story = {
	args: { page: 'invite-team' },
};
