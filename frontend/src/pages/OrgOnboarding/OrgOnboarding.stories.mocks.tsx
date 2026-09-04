/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';
import { rolesListResponse } from 'pages/Settings/__story_mockdata__/roles';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

const QUESTIONNAIRE = 'Onboarding · questionnaire';

/**
 * The four pages the questionnaire holds in component state. Nothing in the URL
 * says which one is open, so a story reaches one by answering the ones before
 * it; `advanceToQuestionnairePage` in the story file is that walk.
 */
export const QUESTIONNAIRE_PAGES = [
	'about-your-org',
	'about-signoz',
	'your-scale',
	'invite-team',
] as const;

export type QuestionnairePage = (typeof QUESTIONNAIRE_PAGES)[number];

export const orgOnboardingMocks = defineStoryMocks({
	controls: {
		page: choiceControl<QuestionnairePage>('Questionnaire page', {
			group: QUESTIONNAIRE,
			description:
				'Which page of the questionnaire the story opens on. Every page before it is answered with the least its Next button accepts.',
			options: QUESTIONNAIRE_PAGES,
			value: 'about-your-org',
		}),
	},
	handlers: (_values, response) => [
		// Answering the scale page saves the profile, and the last page only opens
		// once that call settles: a plain resolver, so `Data` cannot strand the
		// questionnaire two pages in.
		rest.put('http://localhost/api/v2/zeus/profiles', (_req, res, ctx) =>
			res(ctx.status(204)),
		),
		rest.get(
			'http://localhost/api/v1/roles',
			response.json(() => rolesListResponse(0)),
		),
	],
	config: () => ({ route: ROUTES.ONBOARDING }),
});
