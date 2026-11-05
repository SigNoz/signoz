/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest, type ResponseComposition, type RestContext } from 'msw';
import { screen, userEvent, within } from 'storybook/test';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	alertRulesResponse,
	RULE_MAX,
	RULE_STATE_CHOICES,
	SEVERITY_CHOICES,
	type RuleStateChoice,
	type SeverityChoice,
} from '../../stories/__story_mockdata__/alerts';
import { AlertListTabs } from '../../types';

const LIST = 'Alert rules · list';
const ACTIONS = 'Alert rules · row actions';

const ACTION_STATES = ['success', 'loading', 'error'] as const;
type ActionState = (typeof ACTION_STATES)[number];

const actionDescription = (call: string): string =>
	`How the ${call} behind the row action answers. \`loading\` never answers and keeps the promise toast pending, \`error\` settles it with the failure.`;

const actionResponse = (
	state: ActionState,
	res: ResponseComposition,
	ctx: RestContext,
	body: () => unknown,
): ReturnType<ResponseComposition> => {
	if (state === 'loading') {
		return res(ctx.delay('infinite'));
	}

	return state === 'error'
		? res(
				ctx.status(500),
				ctx.json({
					status: 'error',
					error: { code: 'internal', message: 'The server could not finish' },
				}),
			)
		: res(ctx.status(200), ctx.json(body()));
};

export const alertRulesMocks = defineStoryMocks({
	controls: {
		rules: countControl('Alert rules', {
			group: LIST,
			value: 8,
			max: RULE_MAX,
		}),
		ruleSeverity: choiceControl<SeverityChoice>('Severity', {
			group: LIST,
			description:
				'The severity label every rule carries. `mixed` leaves each rule with its own.',
			options: SEVERITY_CHOICES,
			value: 'mixed',
		}),
		ruleState: choiceControl<RuleStateChoice>('State', {
			group: LIST,
			description:
				'The evaluation state the Status column shows. `disabled` also switches the row action to Enable.',
			options: RULE_STATE_CHOICES,
			value: 'mixed',
		}),
		toggleState: choiceControl<ActionState>('Enable or disable', {
			group: ACTIONS,
			description: actionDescription('PATCH'),
			options: ACTION_STATES,
			value: 'success',
		}),
		cloneState: choiceControl<ActionState>('Clone', {
			group: ACTIONS,
			description: actionDescription('POST'),
			options: ACTION_STATES,
			value: 'success',
		}),
		deleteState: choiceControl<ActionState>('Delete', {
			group: ACTIONS,
			description: actionDescription('DELETE'),
			options: ACTION_STATES,
			value: 'success',
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/rules',
			response.json(() =>
				alertRulesResponse(values.rules, {
					severity: values.ruleSeverity,
					state: values.ruleState,
				}),
			),
		),

		rest.patch('http://localhost/api/v2/rules/:id', (_req, res, ctx) =>
			actionResponse(values.toggleState, res, ctx, () => ({
				status: 'success',
				data: null,
			})),
		),

		rest.post('http://localhost/api/v2/rules', (_req, res, ctx) =>
			actionResponse(values.cloneState, res, ctx, () => ({
				status: 'success',
				data: alertRulesResponse(1, {
					severity: values.ruleSeverity,
					state: values.ruleState,
				}).data?.[0],
			})),
		),

		rest.delete('http://localhost/api/v2/rules/:id', (_req, res, ctx) =>
			actionResponse(values.deleteState, res, ctx, () => ({
				status: 'success',
				data: null,
			})),
		),
	],
	config: () => ({ route: `/alerts?tab=${AlertListTabs.ALERT_RULES}` }),
});

/** The page fetches before it renders a row, which outlasts the 1s default. */
export const untilLoaded = { timeout: 15_000 };

export const runRowAction = async (
	canvasElement: HTMLElement,
	name: RegExp,
): Promise<void> => {
	const [actions] = await within(canvasElement).findAllByTestId(
		'alert-actions',
		undefined,
		untilLoaded,
	);

	await userEvent.click(actions);
	await userEvent.click(await screen.findByRole('menuitem', { name }));
};
