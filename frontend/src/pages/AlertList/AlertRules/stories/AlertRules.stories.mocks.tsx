/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { rest, type ResponseComposition, type RestContext } from 'msw';
import { screen, userEvent, within } from 'storybook/test';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import {
	orgUsersResponse,
	STORY_USER_EMAIL,
} from '@/storybook/msw/__story_mockdata__/orgUsers';
import { useAlertRuleViewsStore } from 'container/ListAlertRules/useAlertRuleViewsStore';
import { DEFAULT_RULE_LIST_FILTER } from 'container/ListAlertRules/utils';
import {
	builtinRuleViewFilter,
	RuleBuiltinViewId,
} from 'container/ListAlertRules/views';

import {
	alertRulesResponse,
	RULE_MAX,
	RULE_STATE_CHOICES,
	SEVERITY_CHOICES,
	type RuleStateChoice,
	type SeverityChoice,
} from '../../stories/__story_mockdata__/alerts';
import { AlertListTabs } from '../../types';
import {
	alertRulesPage,
	INVALID_QUERY_CHOICES,
	invalidRuleQueryError,
	type InvalidQueryChoice,
	RULE_VIEW_MAX,
	ruleView,
	ruleViewsResponse,
} from './__story_mockdata__/ruleViews';

const LIST = 'Alert rules · list';
const ACTIONS = 'Alert rules · row actions';
const VIEWS = 'Alert rules · saved views';

const ACTION_STATES = ['success', 'loading', 'error'] as const;
type ActionState = (typeof ACTION_STATES)[number];

const VIEW_CHOICES = [
	RuleBuiltinViewId.All,
	RuleBuiltinViewId.Mine,
	RuleBuiltinViewId.Firing,
	RuleBuiltinViewId.Disabled,
	'saved',
] as const;
type ViewChoice = (typeof VIEW_CHOICES)[number];

/**
 * The rail applies a view by writing `view` with its `query` and `states`, so a
 * story that opens on one seeds all three or the rail shows unsaved changes.
 */
const listRoute = (view: ViewChoice): string => {
	const params = new URLSearchParams({ tab: AlertListTabs.ALERT_RULES });
	if (view === RuleBuiltinViewId.All) {
		return `/alerts?${params.toString()}`;
	}

	const saved = ruleView(0);
	const filter =
		view === 'saved'
			? { query: saved.data.query ?? '', states: saved.data.states ?? [] }
			: builtinRuleViewFilter(view, DEFAULT_RULE_LIST_FILTER, STORY_USER_EMAIL);

	params.set('view', view === 'saved' ? saved.id : view);
	if (filter?.query) {
		params.set('query', filter.query);
	}
	filter?.states.forEach((state) => params.append('states', state));

	return `/alerts?${params.toString()}`;
};

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
		invalidQuery: choiceControl<InvalidQueryChoice>('Invalid query', {
			group: LIST,
			description:
				'The 400 code any request carrying a `query` answers with. Both show the server message under the search box.',
			options: INVALID_QUERY_CHOICES,
			value: 'off',
		}),
		view: choiceControl<ViewChoice>('Active view', {
			group: VIEWS,
			description:
				'The rail entry the page opens on. `saved` is the first saved view; the built-ins apply a query or a state set.',
			options: VIEW_CHOICES,
			value: RuleBuiltinViewId.All,
		}),
		railCollapsed: toggleControl('Rail collapsed', {
			group: VIEWS,
			description:
				'The rail collapsed from the status bar, as the browser remembers it.',
			value: false,
		}),
		ruleViews: countControl('Saved views', {
			group: VIEWS,
			value: 3,
			max: RULE_VIEW_MAX,
		}),
		ruleViewsState: choiceControl<ActionState>('Views list', {
			group: VIEWS,
			description:
				'How the views list behind the rail answers, independent of the rule list.',
			options: ACTION_STATES,
			value: 'success',
		}),
		saveViewState: choiceControl<ActionState>('Save, rename or delete', {
			group: VIEWS,
			description: `${actionDescription('POST, PUT or DELETE')} The list does not change after a write: it answers with the Saved views count.`,
			options: ACTION_STATES,
			value: 'success',
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
		rest.get('http://localhost/api/v3/rules', (req, res, ctx) =>
			values.invalidQuery !== 'off' && req.url.searchParams.get('query')
				? res(ctx.status(400), ctx.json(invalidRuleQueryError(values.invalidQuery)))
				: response.json(() =>
						alertRulesPage(
							values.rules,
							{ severity: values.ruleSeverity, state: values.ruleState },
							req.url.searchParams,
						),
					)(req, res, ctx),
		),

		rest.get(
			'http://localhost/api/v2/users',
			response.json(() => orgUsersResponse()),
		),

		rest.get('http://localhost/api/v2/rule_views', (_req, res, ctx) =>
			actionResponse(values.ruleViewsState, res, ctx, () =>
				ruleViewsResponse(values.ruleViews),
			),
		),

		rest.post('http://localhost/api/v2/rule_views', async (req, res, ctx) => {
			const body = (await req.json()) as object;
			return actionResponse(values.saveViewState, res, ctx, () => ({
				status: 'success',
				data: { ...ruleView(values.ruleViews), ...body },
			}));
		}),

		rest.put('http://localhost/api/v2/rule_views/:id', async (req, res, ctx) => {
			const body = (await req.json()) as object;
			return actionResponse(values.saveViewState, res, ctx, () => ({
				status: 'success',
				data: { ...ruleView(0), ...body, id: req.params.id },
			}));
		}),

		rest.delete('http://localhost/api/v2/rule_views/:id', (_req, res, ctx) =>
			values.saveViewState === 'success'
				? res(ctx.status(204))
				: actionResponse(values.saveViewState, res, ctx, () => null),
		),

		rest.patch('http://localhost/api/v2/rules/:id', (_req, res, ctx) =>
			actionResponse(values.toggleState, res, ctx, () => ({
				status: 'success',
				data: null,
			})),
		),

		rest.post('http://localhost/api/v2/rules/:id/clone', (_req, res, ctx) =>
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
	config: (values) => ({ route: listRoute(values.view) }),
	effect: (values) => {
		useAlertRuleViewsStore.setState({ railCollapsed: values.railCollapsed });
	},
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
