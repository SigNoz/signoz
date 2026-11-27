// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { ENVIRONMENT } from 'constants/env';
import {
	extractCompositeQueryObject,
	INIT_URL_WITH_COMMON_QUERY,
	MOCK_ERROR_LIST,
	TAG_FROM_QUERY,
} from 'container/AllError/tests/constants';
import { server } from 'mocks-server/server';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { rest } from 'msw';
import store from 'store';
import {
	render,
	screen,
	userEvent,
	waitFor,
	within,
	NO_DELAY_USER_EVENT,
} from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import AllErrors from '../index';

// The stubbed time picker never finishes loading the global time, which gates the list.
jest.mock('react-redux', () => ({
	...jest.requireActual('react-redux'),
	useSelector: jest.fn(),
}));

jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: function MockDateTimeSelector(): JSX.Element {
		return <div data-testid="datetime-selector" />;
	},
}));

const listErrorsURL = `${ENVIRONMENT.baseURL}/api/v1/listErrors`;
const countErrorsURL = `${ENVIRONMENT.baseURL}/api/v1/countErrors`;

const listErrorsSpy = jest.fn() as jest.MockedFunction<(body: unknown) => void>;

const lastNavigatedFilterItems = (): unknown => {
	const { calls } = safeNavigateMock.mock;
	const to = calls[calls.length - 1]?.[0];
	const query = extractCompositeQueryObject(
		typeof to === 'string' ? to : '',
	) as Query | null;

	return query?.builder.queryData[0]?.filters?.items;
};

const KEPT_FILTER_ITEMS = [
	expect.objectContaining({
		key: expect.objectContaining({ key: 'deployment.environment' }),
		value: 'mq-kafka',
	}),
];

describe('Exceptions page - run query', () => {
	beforeEach(() => {
		const state = store.getState();
		jest.mocked(useSelector).mockImplementation((selector) =>
			selector({
				...state,
				globalTime: { ...state.globalTime, loading: false },
			}),
		);
		safeNavigateMock.mockClear();
		listErrorsSpy.mockClear();
		server.use(
			rest.post(listErrorsURL, async (req, res, ctx) => {
				listErrorsSpy(await req.json());
				return res(ctx.status(200), ctx.json(MOCK_ERROR_LIST));
			}),
			rest.post(countErrorsURL, (_req, res, ctx) =>
				res(ctx.status(200), ctx.json(MOCK_ERROR_LIST.length)),
			),
		);
	});

	const renderWithFilter = async (): Promise<void> => {
		render(<AllErrors />, undefined, {
			initialRoute: INIT_URL_WITH_COMMON_QUERY,
		});
		await waitFor(() =>
			expect(listErrorsSpy).toHaveBeenCalledWith(
				expect.objectContaining({ tags: TAG_FROM_QUERY }),
			),
		);
	};

	it('keeps the filter items in the query when Run Query is clicked', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		await renderWithFilter();

		// The button reads Cancel while the list is still fetching.
		await user.click(await screen.findByTestId('explorer-run-query-btn'));

		await waitFor(() =>
			expect(lastNavigatedFilterItems()).toStrictEqual(KEPT_FILTER_ITEMS),
		);
	});

	it('keeps the filter items in the query on Ctrl+Enter in the search bar', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		await renderWithFilter();

		within(screen.getByTestId('qb-search-select'))
			.getByRole('combobox', { hidden: true })
			.focus();
		await user.keyboard('{Control>}{Enter}{/Control}');

		await waitFor(() =>
			expect(lastNavigatedFilterItems()).toStrictEqual(KEPT_FILTER_ITEMS),
		);
	});
});
