import { ReactElement, useEffect, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { render, RenderResult } from '@testing-library/react';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import {
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSavedViewSpecDTO,
	SavedviewtypesSchemaVersionDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { createMemoryHistory, MemoryHistory } from 'history';
import { useGetPanelTypesQueryParam } from 'hooks/queryBuilder/useGetPanelTypesQueryParam';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { AppContext } from 'providers/App/App';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import TimezoneProvider from 'providers/Timezone';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import store from 'store';
import { getAppContextMock } from 'tests/test-utils';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { __setSearchParamsGetterForTest } from 'utils/getUnstableCurrentSearchParams';

import { getSavedViewQuery } from '../utils/getSavedViewQuery';
import { toSavedViewSpec } from '../utils/toSavedViewSpec';
import { TEST_USER_EMAIL } from './savedViewsApiMock';

// The server stores queries through typed structs: nulls, empty strings,
// zeros and empty lists do not come back.
function asStoredByServer(value: unknown): unknown {
	if (Array.isArray(value)) {
		const items = value.map(asStoredByServer).filter((v) => v !== undefined);
		return items.length > 0 ? items : undefined;
	}
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value)
				.map(([key, v]) => [key, asStoredByServer(v)] as const)
				.filter(([, v]) => v !== undefined),
		);
	}
	return value === null || value === '' || value === 0 ? undefined : value;
}

export function queryWith(dataSource: DataSource, expression: string): Query {
	const base = initialQueriesMap[dataSource];
	return {
		...base,
		builder: {
			...base.builder,
			queryData: [
				{
					...base.builder.queryData[0],
					filter: { expression },
					aggregations: [{ expression: 'count()' }],
				},
			],
		},
	} as Query;
}

export function makeView({
	id,
	displayName,
	source = SavedviewtypesSourceDTO.traces,
	dataSource = DataSource.TRACES,
	expression = 'has_error = true',
	query = queryWith(dataSource, expression),
	panelType = PANEL_TYPES.LIST,
	createdBy = TEST_USER_EMAIL,
	updatedBy = createdBy,
	updatedAt,
}: {
	id: string;
	displayName: string;
	source?: SavedviewtypesSourceDTO;
	dataSource?: DataSource;
	expression?: string;
	query?: Query;
	panelType?: PANEL_TYPES;
	createdBy?: string;
	updatedBy?: string;
	updatedAt?: string;
}): SavedviewtypesSavedViewDTO {
	const spec = toSavedViewSpec({
		query,
		panelType,
		displayName,
	});
	return {
		id,
		name: `${displayName.toLowerCase()}-abc`,
		source,
		schemaVersion: SavedviewtypesSchemaVersionDTO.v2,
		createdBy,
		updatedBy,
		updatedAt,
		spec: {
			...spec,
			queries: asStoredByServer(
				JSON.parse(JSON.stringify(spec.queries)),
			) as SavedviewtypesSavedViewSpecDTO['queries'],
		},
	} as SavedviewtypesSavedViewDTO;
}

// Params written the way the query builder redirect writes them.
export function explorerUrl(
	path: string,
	{
		query,
		panelType,
		viewKey,
		relativeTime = '15m',
	}: {
		query?: Query;
		panelType?: PANEL_TYPES;
		viewKey?: string;
		relativeTime?: string;
	},
): string {
	const params = new URLSearchParams();
	if (query) {
		params.set(
			QueryParams.compositeQuery,
			encodeURIComponent(JSON.stringify({ ...query, id: `url-${Math.random()}` })),
		);
	}
	if (panelType) {
		params.set(QueryParams.panelTypes, JSON.stringify(panelType));
	}
	if (viewKey) {
		params.set(QueryParams.viewKey, JSON.stringify(viewKey));
	}
	params.set(QueryParams.relativeTime, relativeTime);
	return `${path}?${params.toString()}`;
}

export function viewUrl(
	path: string,
	view: SavedviewtypesSavedViewDTO,
	relativeTime?: string,
): string {
	return explorerUrl(path, {
		query: getSavedViewQuery(view),
		panelType: view.spec.panelType as unknown as PANEL_TYPES,
		viewKey: view.id,
		relativeTime,
	});
}

const mockStore = configureStore([thunk]);

// What the explorer page does around the header: writes its default query to a
// bare url, and sets the provider's tab from the url (the provider alone seeds
// it from the raw, still JSON-quoted param).
function ExplorerShell({ dataSource }: { dataSource: DataSource }): null {
	const panelType = useGetPanelTypesQueryParam(PANEL_TYPES.LIST);
	const { handleSetConfig, updateAllQueriesOperators } = useQueryBuilder();
	const defaultQuery = useMemo(
		() =>
			updateAllQueriesOperators(
				initialQueriesMap[dataSource],
				PANEL_TYPES.LIST,
				dataSource,
			),
		[updateAllQueriesOperators, dataSource],
	);
	useShareBuilderUrl({ defaultValue: defaultQuery });
	useEffect(() => {
		handleSetConfig(panelType, dataSource);
	}, [panelType, dataSource, handleSetConfig]);
	return null;
}

export function renderWithExplorerProviders(
	ui: ReactElement,
	initialUrl: string,
	dataSource: DataSource = DataSource.TRACES,
): RenderResult & { history: MemoryHistory } {
	const history = createMemoryHistory({ initialEntries: [initialUrl] });
	// Parts of the explorer read window.location directly, so it follows the
	// router's history.
	const syncWindowLocation = (): void =>
		window.history.replaceState(
			null,
			'',
			`${history.location.pathname}${history.location.search}`,
		);
	syncWindowLocation();
	history.listen(syncWindowLocation);
	__setSearchParamsGetterForTest(
		() => new URLSearchParams(history.location.search),
	);
	safeNavigateMock.mockImplementation((to) => {
		history.push(
			typeof to === 'string'
				? to
				: `${to.pathname ?? history.location.pathname}${to.search ?? ''}`,
		);
	});

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { refetchOnWindowFocus: false, retry: false },
			mutations: { retry: false },
		},
	});

	const defaultAppContext = getAppContextMock('ADMIN');
	const appContext = {
		...defaultAppContext,
		user: { ...defaultAppContext.user, email: TEST_USER_EMAIL },
	};

	const result = render(
		<Router history={history}>
			<CompatRouter>
				<NuqsAdapter>
					<QueryClientProvider client={queryClient}>
						<Provider store={mockStore(store.getState())}>
							<AppContext.Provider value={appContext}>
								<TimezoneProvider>
									<TooltipProvider>
										<PreferenceContextProvider>
											<QueryBuilderProvider>
												<ExplorerShell dataSource={dataSource} />
												{ui}
											</QueryBuilderProvider>
										</PreferenceContextProvider>
									</TooltipProvider>
								</TimezoneProvider>
							</AppContext.Provider>
						</Provider>
					</QueryClientProvider>
				</NuqsAdapter>
			</CompatRouter>
		</Router>,
	);
	return { ...result, history };
}

export function urlParam(history: MemoryHistory, key: string): string | null {
	return new URLSearchParams(history.location.search).get(key);
}
