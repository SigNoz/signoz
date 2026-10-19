import { VirtuosoMockContext } from 'react-virtuoso';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { QueryBuilderContext } from 'providers/QueryBuilder';
import { act, render } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import LogsExplorerViews from '..';
import {
	logsQueryRangeSuccessNewFormatResponse,
	mockQueryBuilderContextValue,
} from './mock';

let mockOnEndReached: () => void = () => {};
let mockIsFetching = false;

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.LOGS_EXPLORER}`,
	}),
}));

jest.mock('hooks/queryBuilder/useGetExplorerQueryRange', () => ({
	__esModule: true,
	useGetExplorerQueryRange: jest.fn(),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): any => ({ safeNavigate: jest.fn() }),
}));

jest.mock('hooks/useUrlQueryData', () => {
	const actual = jest.requireActual('hooks/useUrlQueryData');
	return {
		__esModule: true,
		default: (key: string, ...rest: unknown[]): unknown =>
			key === 'pageSize'
				? { queryData: 1, redirectWithQuery: jest.fn() }
				: actual.default(key, ...rest),
	};
});

jest.mock('hooks/logs/useCopyLogLink', () => ({
	useCopyLogLink: jest.fn().mockReturnValue({ activeLogId: undefined }),
}));

jest.mock('providers/preferences/sync/usePreferenceSync', () => ({
	usePreferenceSync: (): any => ({
		preferences: {
			columns: [],
			formatting: { maxLines: 1, format: 'table', fontSize: 'small', version: 1 },
		},
		loading: false,
		error: null,
		updateColumns: jest.fn(),
		updateFormatting: jest.fn(),
	}),
}));

jest.mock('container/LogsExplorerChart', () => (): JSX.Element => <div />);

jest.mock(
	'container/LogsExplorerList',
	() =>
		function MockLogsExplorerList({
			onEndReached,
		}: {
			onEndReached: () => void;
		}): JSX.Element {
			mockOnEndReached = onEndReached;
			return <div>list</div>;
		},
);

const getRequestedOffsets = (): number[] => {
	const offsets: number[] = [];
	(useGetExplorerQueryRange as jest.Mock).mock.calls.forEach(([query]) => {
		const offset = (query as Query | null)?.builder.queryData[0]?.offset;
		if (typeof offset === 'number' && offsets[offsets.length - 1] !== offset) {
			offsets.push(offset);
		}
	});
	return offsets;
};

function views(): JSX.Element {
	return (
		<VirtuosoMockContext.Provider
			value={{ viewportHeight: 300, itemHeight: 100 }}
		>
			<QueryBuilderContext.Provider
				value={{
					...mockQueryBuilderContextValue,
					panelType: PANEL_TYPES.LIST,
				}}
			>
				<PreferenceContextProvider>
					<LogsExplorerViews
						setIsLoadingQueries={(): void => {}}
						listQueryKeyRef={{ current: {} }}
						chartQueryKeyRef={{ current: {} }}
						setWarning={(): void => {}}
						showLiveLogs={false}
						handleChangeSelectedView={(): void => {}}
					/>
				</PreferenceContextProvider>
			</QueryBuilderContext.Provider>
		</VirtuosoMockContext.Provider>
	);
}

describe('LogsExplorerViews infinite scroll', () => {
	beforeEach(() => {
		(useGetExplorerQueryRange as jest.Mock).mockReset();
		mockIsFetching = false;
		const resultByQuery = new WeakMap<object, object>();
		(useGetExplorerQueryRange as jest.Mock).mockImplementation(
			(query: Query | null) => {
				const key = query ?? resultByQuery;
				if (!resultByQuery.has(key)) {
					resultByQuery.set(key, {
						data: { payload: logsQueryRangeSuccessNewFormatResponse },
						isLoading: false,
					});
				}
				return { ...resultByQuery.get(key), isFetching: mockIsFetching };
			},
		);
	});

	it('requests each page once when the end is reached again before the page loads', () => {
		render(views());

		act(() => {
			mockOnEndReached();
		});
		act(() => {
			mockOnEndReached();
		});
		act(() => {
			mockOnEndReached();
		});

		expect(getRequestedOffsets()).toStrictEqual([0, 1]);
	});

	it('requests the next page once the previous one has loaded', () => {
		const { rerender } = render(views());

		act(() => {
			mockIsFetching = true;
			mockOnEndReached();
		});
		act(() => {
			mockOnEndReached();
		});
		act(() => {
			mockIsFetching = false;
			rerender(views());
		});
		act(() => {
			mockOnEndReached();
		});

		expect(getRequestedOffsets()).toStrictEqual([0, 1, 2]);
	});
});
