import {
	RuletypesAlertStateDTO,
	type RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { navigate } from 'lib/router/navigation';
import {
	alertRulesFixture,
	listRulesV3Response,
} from 'mocks-server/__mockdata__/alert_rules';
import { rest, server } from 'mocks-server/server';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import { RuleCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import AlertRules from '../AlertRules/AlertRules';

jest.mock('lib/router/navigation', () => ({
	...jest.requireActual('lib/router/navigation'),
	navigate: jest.fn(),
}));

const rule = (id: string, state: RuletypesAlertStateDTO): RuletypesRuleDTO => ({
	...alertRulesFixture[0],
	id,
	alert: `${id} rule`,
	state,
});

const burning = rule('burning', RuletypesAlertStateDTO.firing);
const quiet = rule('quiet', RuletypesAlertStateDTO.inactive);
const waiting = rule('waiting', RuletypesAlertStateDTO.pending);

const serveRules = (
	rules: RuletypesRuleDTO[],
	rulesForLatest = rules,
): string[] => {
	const requestedStates: string[] = [];
	server.use(
		rest.get('http://localhost/api/v3/rules', (req, res, ctx) => {
			const states = req.url.searchParams.getAll('states').join();
			requestedStates.push(states);
			return res(
				ctx.status(200),
				ctx.json(
					listRulesV3Response(
						states === 'firing' ? rules : rulesForLatest,
						req.url.searchParams,
					),
				),
			);
		}),
	);
	return requestedStates;
};

const renderAlertRules = (): void => {
	render(
		<AlertRules
			onUpdateChecklistDoneItem={jest.fn()}
			loadingUserPreferences={false}
		/>,
	);
};

const renderedRuleIds = (): (string | undefined)[] =>
	screen.getAllByTestId(/^home-alert-rule-/).map((row) => row.dataset.testid);

describe('Home alert rules', () => {
	it('lists firing rules first, then the latest others, and opens the clicked rule', async () => {
		const requestedStates = serveRules([quiet, burning, waiting]);
		renderAlertRules();

		await expect(
			screen.findByTestId('home-alert-rule-waiting'),
		).resolves.toBeInTheDocument();
		expect(renderedRuleIds()).toStrictEqual([
			'home-alert-rule-burning',
			'home-alert-rule-quiet',
			'home-alert-rule-waiting',
		]);
		expect(requestedStates).toStrictEqual(['firing', '']);

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(screen.getByTestId('home-alert-rule-burning'));
		expect(navigate).toHaveBeenCalledWith(
			`${ROUTES.ALERT_OVERVIEW}?${QueryParams.ruleId}=burning`,
		);
	});

	it('skips the latest rules request when 5 rules are firing', async () => {
		const firing = Array.from({ length: 5 }, (_, index) =>
			rule(`firing-${index}`, RuletypesAlertStateDTO.firing),
		);
		const requestedStates = serveRules([quiet, ...firing]);
		renderAlertRules();

		await expect(
			screen.findByTestId('home-alert-rule-firing-4'),
		).resolves.toBeInTheDocument();
		expect(renderedRuleIds()).toStrictEqual(
			firing.map(({ id }) => `home-alert-rule-${id}`),
		);
		expect(requestedStates).toStrictEqual(['firing']);
	});

	it('shows a rule once when it stops firing between the two requests', async () => {
		const settled = { ...burning, state: RuletypesAlertStateDTO.inactive };
		serveRules([burning], [settled, quiet]);
		renderAlertRules();

		await expect(
			screen.findByTestId('home-alert-rule-quiet'),
		).resolves.toBeInTheDocument();
		expect(renderedRuleIds()).toStrictEqual([
			'home-alert-rule-burning',
			'home-alert-rule-quiet',
		]);
	});
});

describe('Home alert rules - authz', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('shows a permission callout instead of a skeleton without list', async () => {
		serveRules([burning]);
		server.use(setupAuthzDenyAll());
		renderAlertRules();

		await expect(screen.findByText('list:rule:*')).resolves.toBeInTheDocument();
		expect(screen.queryByTestId(/^home-alert-rule-/)).not.toBeInTheDocument();
	});

	it('locks Create Alert Rule without create, with no link to follow', async () => {
		serveRules([]);
		server.use(setupAuthzDeny(RuleCreatePermission));
		renderAlertRules();

		await waitFor(() =>
			expect(screen.getByTestId('home-create-alert-rule')).toHaveAttribute(
				'data-denied-permissions',
				RuleCreatePermission,
			),
		);
		const button = screen.getByTestId('home-create-alert-rule');
		expect(button).toBeDisabled();
		expect(button.closest('a')).toBeNull();
	});

	it('links Create Alert Rule to the new alert page with create', async () => {
		serveRules([]);
		server.use(setupAuthzAdmin());
		renderAlertRules();

		const button = await screen.findByTestId('home-create-alert-rule');
		await waitFor(() =>
			expect(button.closest('a')).toHaveAttribute('href', ROUTES.ALERTS_NEW),
		);
		expect(screen.queryByText('list:rule:*')).not.toBeInTheDocument();
	});
});
