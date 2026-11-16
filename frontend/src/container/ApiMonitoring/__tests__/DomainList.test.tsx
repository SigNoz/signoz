import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { rest, server } from 'mocks-server/server';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import DomainList from '../Explorer/Domains/DomainList';

const FILTER = "http_host = 'api.example.com'";

jest.mock('components/QueryBuilderV2/QueryV2/QuerySearch/QuerySearch', () => ({
	__esModule: true,
	default: jest
		.fn()
		.mockImplementation(
			({
				onChange,
				onRun,
			}: {
				onChange: (query: string) => void;
				onRun?: (query: string) => void;
			}) => (
				<>
					<button
						type="button"
						data-testid="query-search-type"
						onClick={(): void => onChange("http_host = 'api.example.com'")}
					>
						Type
					</button>
					<button
						type="button"
						data-testid="query-search-run"
						onClick={(): void => onRun?.("http_host = 'api.example.com'")}
					>
						Run
					</button>
				</>
			),
		),
}));

jest.mock('container/Toolbar/Toolbar', () => ({
	__esModule: true,
	default: (): null => null,
}));

jest.mock('../Explorer/Domains/DomainDetails/DomainDetails', () => ({
	__esModule: true,
	default: (): null => null,
}));

// Under the test router it keeps rewriting the URL, which re-renders the page
// without end.
jest.mock('hooks/queryBuilder/useShareBuilderUrl', () => ({
	useShareBuilderUrl: jest.fn(),
}));

describe('DomainList', () => {
	it('runs the typed filter from the filter box', async () => {
		let listRequests = 0;
		server.use(
			rest.post('*/third-party-apis/overview/list', (_req, res, ctx) => {
				listRequests += 1;
				return res(ctx.status(200), ctx.json({ data: { data: { results: [] } } }));
			}),
		);
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(<DomainList />, undefined, {
			initialRoute: '/api-monitoring/explorer',
		});
		await waitFor(() => expect(listRequests).toBe(1));

		await user.click(screen.getByTestId('query-search-type'));
		await user.click(screen.getByTestId('query-search-run'));

		await waitFor(() => expect(listRequests).toBe(2));
		const [url] = safeNavigateMock.mock.calls[0];
		const compositeQuery = new URLSearchParams(String(url).split('?')[1]).get(
			'compositeQuery',
		);
		expect(decodeURIComponent(compositeQuery ?? '')).toContain(
			`"expression":"${FILTER}"`,
		);
	});
});
