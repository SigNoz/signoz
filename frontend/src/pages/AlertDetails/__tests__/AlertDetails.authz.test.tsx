import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen } from 'tests/test-utils';
import { buildRuleReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';
import {
	setupAuthzAdmin,
	setupAuthzDeny,
} from 'lib/authz/utils/authz-test-utils';

import AlertDetailsPage from '..';

const RULE_ID = 'rule-1';
const NOT_FOUND = "Uh-oh! We couldn't find the given alert rule.";

const renderDetails = (): void => {
	render(<AlertDetailsPage />, undefined, {
		initialRoute: `/alerts/overview?ruleId=${RULE_ID}`,
	});
};

describe('AlertDetails - AuthZ', () => {
	beforeEach(() => {
		server.use(
			rest.get(`http://localhost/api/v2/rules/${RULE_ID}`, (_req, res, ctx) =>
				res(ctx.status(404), ctx.json({ status: 'error' })),
			),
		);
	});

	afterEach(() => {
		server.resetHandlers();
	});

	it('shows the full-page denial instead of not found without read', async () => {
		const read = buildRuleReadPermission(RULE_ID);
		server.use(setupAuthzDeny(read));
		renderDetails();

		await expect(
			screen.findByText('Uh-oh! You are not authorized'),
		).resolves.toBeInTheDocument();
		expect(screen.getByText(formatPermission(read))).toBeInTheDocument();
		expect(screen.queryByText(NOT_FOUND)).not.toBeInTheDocument();
	});

	it('opens the page with read', async () => {
		server.use(setupAuthzAdmin());
		renderDetails();

		await expect(screen.findByText(NOT_FOUND)).resolves.toBeInTheDocument();
	});
});
