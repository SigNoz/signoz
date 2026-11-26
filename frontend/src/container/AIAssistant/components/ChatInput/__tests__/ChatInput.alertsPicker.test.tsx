import {
	alertRulesFixture,
	listRulesV3Response,
} from 'mocks-server/__mockdata__/alert_rules';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent } from 'tests/test-utils';

jest.mock('api/generated/services/dashboard', () => ({
	useListDashboardsForUserV2: (): unknown => ({
		data: undefined,
		isLoading: false,
		isError: false,
	}),
	getListDashboardsForUserV2QueryKey: (): string[] => ['dashboards'],
}));

jest.mock('hooks/useQueryService', () => ({
	useQueryService: (): unknown => ({
		data: [],
		isLoading: false,
		isFetching: false,
		isError: false,
	}),
}));

// eslint-disable-next-line import/first
import ChatInput from '../ChatInput';

describe('ChatInput — alerts context picker', () => {
	it('lists the rules from one v3 rules request', async () => {
		const [first, second] = alertRulesFixture;
		const requests: string[] = [];
		server.use(
			rest.get('http://localhost/api/v3/rules', (req, res, ctx) => {
				requests.push(req.url.search);
				return res(
					ctx.status(200),
					ctx.json(listRulesV3Response([first, second], req.url.searchParams)),
				);
			}),
		);

		render(<ChatInput onSend={jest.fn()} />);

		await userEvent.click(screen.getByRole('button', { name: /add context/i }));
		await userEvent.click(await screen.findByTestId('ai-context-tab-Alerts'));

		await expect(screen.findByText(first.alert)).resolves.toBeInTheDocument();
		expect(screen.getByText(second.alert)).toBeInTheDocument();
		expect(requests).toStrictEqual(['?limit=200']);
	});
});
