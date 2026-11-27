import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen } from 'tests/test-utils';
import { buildRuleReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';

import EditRules from '..';

const RULE_ID = 'rule-1';
const RULE_URL = `http://localhost/api/v2/rules/${RULE_ID}`;

const renderEditRules = (): void => {
	render(<EditRules />, undefined, {
		initialRoute: `/alerts/edit?ruleId=${RULE_ID}`,
	});
};

describe('EditRules - AuthZ', () => {
	beforeEach(() => {
		// A missing rule renders the page's own error card, which is enough to
		// tell the page from the denial.
		server.use(
			rest.get(RULE_URL, (_req, res, ctx) =>
				res(ctx.status(404), ctx.json({ status: 'error' })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('shows the full-page denial without read on the rule', async () => {
		const read = buildRuleReadPermission(RULE_ID);
		server.use(setupAuthzDeny(read));
		renderEditRules();

		await expect(
			screen.findByText('Uh-oh! You are not authorized'),
		).resolves.toBeInTheDocument();
		expect(screen.getByText(formatPermission(read))).toBeInTheDocument();
		expect(screen.queryByText('Return to Alerts Page')).not.toBeInTheDocument();
	});

	it('opens the page with read on the rule', async () => {
		server.use(setupAuthzAdmin());
		renderEditRules();

		await expect(
			screen.findByText('Return to Alerts Page'),
		).resolves.toBeInTheDocument();
		expect(
			screen.queryByText('Uh-oh! You are not authorized'),
		).not.toBeInTheDocument();
	});
});
