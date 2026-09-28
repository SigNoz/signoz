import {
	ApplyFilterSignalDTO,
	MessageActionKindDTO,
	SavedViewEntityDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import {
	getSavedView,
	listSavedViews,
} from 'api/generated/services/saved-view';
import {
	GetSavedView200,
	ListSavedViews200,
	SavedviewtypesPanelTypeDTO,
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSchemaVersionDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DataSource } from 'types/common/queryBuilder';
import type { History } from 'history';

import {
	buildExplorerNavigationUrl,
	findSavedViewInLists,
	openSavedView,
	openSavedViewByKey,
} from '../openSavedView';
import {
	entityToDataSource,
	isSavedViewOpenAction,
	resolveActionEntity,
	resolveOpenResourceType,
	resolveResourceId,
	resolveResourceType,
	resolveSavedViewSourceHint,
} from '../resolveOpenResource';
import { resourceRoute, ResourceType } from '../resourceRoute';

jest.mock('api/generated/services/saved-view');

jest.mock(
	'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi',
	() => ({
		mapQueryDataFromApi: jest.fn(() => ({
			queryType: 'builder',
			builder: {
				queryData: [{ id: 'A' }],
				queryFormulas: [],
				queryTraceOperator: [],
			},
		})),
	}),
);

const mockedListSavedViews = listSavedViews as jest.MockedFunction<
	typeof listSavedViews
>;
const mockedGetSavedView = getSavedView as jest.MockedFunction<
	typeof getSavedView
>;

function makeView(
	id: string,
	source: SavedviewtypesSourceDTO,
): SavedviewtypesSavedViewDTO {
	return {
		id,
		name: `view-${id}`,
		source,
		schemaVersion: SavedviewtypesSchemaVersionDTO.v2,
		createdAt: '2021-07-07T06:31:00.000Z',
		createdBy: 'user',
		updatedAt: '2021-07-07T06:33:00.000Z',
		updatedBy: 'user',
		spec: {
			displayName: `View ${id}`,
			panelType: SavedviewtypesPanelTypeDTO.list,
			requestType: 'raw',
			queries: [{ type: 'builder_query', spec: { name: 'A', signal: source } }],
		},
	} as unknown as SavedviewtypesSavedViewDTO;
}

function mockViewsResponse(
	views: SavedviewtypesSavedViewDTO[],
): ListSavedViews200 {
	return { status: 'success', data: views };
}

function mockViewByIdResponse(
	view: SavedviewtypesSavedViewDTO,
): GetSavedView200 {
	return { status: 'success', data: view };
}

describe('resourceRoute', () => {
	it('returns null for saved_view so async navigation is used', () => {
		expect(resourceRoute(ResourceType.saved_view, 'view-123')).toBeNull();
	});

	it('routes channels to the edit page', () => {
		expect(resourceRoute(ResourceType.channel, 'channel-uuid-1')).toBe(
			'/alerts/channels/edit/channel-uuid-1',
		);
	});
});

describe('resolveOpenResource', () => {
	it('reads entity from the action envelope', () => {
		expect(
			resolveActionEntity({
				kind: MessageActionKindDTO.open_resource,
				label: 'Open view',
				entity: SavedViewEntityDTO.traces,
			}),
		).toBe(SavedViewEntityDTO.traces);
	});

	it('reads resource id from input.viewKey', () => {
		expect(
			resolveResourceId({
				kind: MessageActionKindDTO.open_resource,
				label: 'Open view',
				input: { viewKey: 'abc-123' },
			}),
		).toBe('abc-123');
	});

	it('maps entity values to explorer data sources', () => {
		expect(entityToDataSource('logs')).toBe(DataSource.LOGS);
		expect(entityToDataSource('logs_explorer')).toBe(DataSource.LOGS);
		expect(entityToDataSource('traces')).toBe(DataSource.TRACES);
	});

	it('prefers entity over signal for saved-view source hints', () => {
		expect(
			resolveSavedViewSourceHint({
				kind: MessageActionKindDTO.open_resource,
				label: 'Open view',
				entity: SavedViewEntityDTO.traces,
				signal: ApplyFilterSignalDTO.logs,
			}),
		).toBe(DataSource.TRACES);
	});

	it('falls back to signal when entity is absent', () => {
		expect(
			resolveSavedViewSourceHint({
				kind: MessageActionKindDTO.open_resource,
				label: 'Open view',
				signal: ApplyFilterSignalDTO.metrics,
			}),
		).toBe(DataSource.METRICS);
	});

	it('normalises saved-view resource types', () => {
		expect(
			resolveResourceType({
				kind: MessageActionKindDTO.open_resource,
				label: 'Open view',
				resourceType: 'saved-view',
			}),
		).toBe(ResourceType.saved_view);
	});

	it('detects open-view actions from label when id is present in input', () => {
		expect(
			isSavedViewOpenAction({
				kind: MessageActionKindDTO.open_resource,
				label: 'Open view',
				input: { viewId: 'view-1' },
			}),
		).toBe(true);
	});

	it('resolves channel type from notification_channel alias', () => {
		expect(
			resolveResourceType({
				kind: MessageActionKindDTO.open_resource,
				label: 'Open channel',
				resourceType: 'notification_channel',
			}),
		).toBe(ResourceType.channel);
	});

	it('infers channel type from Open channel label when resourceId is present', () => {
		expect(
			resolveOpenResourceType({
				kind: MessageActionKindDTO.open_resource,
				label: 'Open channel',
				resourceId: 'channel-1',
			}),
		).toBe(ResourceType.channel);
	});
});

describe('findSavedViewInLists', () => {
	beforeEach(() => {
		mockedListSavedViews.mockReset();
	});

	it('loads only the hinted source when entity is provided', async () => {
		const tracesView = makeView('view-traces', SavedviewtypesSourceDTO.traces);
		mockedListSavedViews.mockResolvedValueOnce(mockViewsResponse([tracesView]));

		const result = await findSavedViewInLists('view-traces', DataSource.TRACES);

		expect(result).toStrictEqual(tracesView);
		expect(mockedListSavedViews).toHaveBeenCalledTimes(1);
		expect(mockedListSavedViews).toHaveBeenCalledWith({
			source: SavedviewtypesSourceDTO.traces,
		});
	});

	it('treats a null list as empty and probes the next source', async () => {
		const metricsView = makeView('view-metrics', SavedviewtypesSourceDTO.metrics);
		mockedListSavedViews
			.mockResolvedValueOnce({ status: 'success', data: null })
			.mockResolvedValueOnce(mockViewsResponse([]))
			.mockResolvedValueOnce(mockViewsResponse([metricsView]));

		const result = await findSavedViewInLists('view-metrics');

		expect(result).toStrictEqual(metricsView);
		expect(mockedListSavedViews).toHaveBeenCalledTimes(3);
	});
});

describe('buildExplorerNavigationUrl', () => {
	it('encodes composite query and view selectors', () => {
		const url = buildExplorerNavigationUrl(
			ROUTES.LOGS_EXPLORER,
			{ queryType: 'builder' } as never,
			{
				[QueryParams.panelTypes]: PANEL_TYPES.LIST,
				[QueryParams.viewName]: 'My view',
				[QueryParams.viewKey]: 'view-1',
			},
		);

		expect(url).toContain(ROUTES.LOGS_EXPLORER);
		expect(url).toContain(`${QueryParams.compositeQuery}=`);
		expect(url).toContain(`${QueryParams.viewKey}=`);
	});
});

describe('openSavedView', () => {
	it('navigates with history.push and view query params', () => {
		const push = jest.fn();
		const history = { push } as unknown as History;
		const view = makeView('view-logs', SavedviewtypesSourceDTO.logs);

		openSavedView(view, history);

		expect(push).toHaveBeenCalledTimes(1);
		const pushedUrl = push.mock.calls[0][0] as string;
		expect(pushedUrl).toContain(ROUTES.LOGS_EXPLORER);
		const params = new URLSearchParams(pushedUrl.split('?')[1]);
		expect(params.get(QueryParams.viewKey)).toBe('"view-logs"');
		expect(params.get(QueryParams.viewName)).toBe('"View view-logs"');
		expect(params.get(QueryParams.panelTypes)).toBe('"list"');
	});

	it('throws when the view has no source', () => {
		const view = makeView('view-logs', SavedviewtypesSourceDTO.logs);
		delete view.source;

		expect(() =>
			openSavedView(view, { push: jest.fn() } as unknown as History),
		).toThrow('Unsupported saved view source');
	});

	it('throws when the view has no queries', () => {
		const view = makeView('view-logs', SavedviewtypesSourceDTO.logs);
		view.spec.queries = [];

		expect(() =>
			openSavedView(view, { push: jest.fn() } as unknown as History),
		).toThrow('Saved view is missing query data');
	});
});

describe('openSavedViewByKey', () => {
	beforeEach(() => {
		mockedListSavedViews.mockReset();
		mockedGetSavedView.mockReset();
	});

	it('prefers the direct view lookup endpoint', async () => {
		const view = makeView('view-logs', SavedviewtypesSourceDTO.logs);
		mockedGetSavedView.mockResolvedValueOnce(mockViewByIdResponse(view));
		const push = jest.fn();
		const history = { push } as unknown as History;

		await openSavedViewByKey('view-logs', DataSource.LOGS, history);

		expect(mockedGetSavedView).toHaveBeenCalledWith({ id: 'view-logs' });
		expect(mockedListSavedViews).not.toHaveBeenCalled();
		expect(push).toHaveBeenCalled();
	});

	it('falls back to list probing when direct lookup fails', async () => {
		const view = makeView('view-traces', SavedviewtypesSourceDTO.traces);
		mockedGetSavedView.mockRejectedValueOnce(new Error('not found'));
		mockedListSavedViews.mockResolvedValueOnce(mockViewsResponse([view]));
		const push = jest.fn();
		const history = { push } as unknown as History;

		await openSavedViewByKey('view-traces', DataSource.TRACES, history);

		expect(mockedListSavedViews).toHaveBeenCalledWith({
			source: SavedviewtypesSourceDTO.traces,
		});
		expect(push).toHaveBeenCalled();
	});

	it('throws when the saved view does not exist', async () => {
		mockedGetSavedView.mockRejectedValueOnce(new Error('not found'));
		mockedListSavedViews.mockResolvedValue(mockViewsResponse([]));

		await expect(
			openSavedViewByKey('missing', DataSource.LOGS, {
				push: jest.fn(),
			} as unknown as History),
		).rejects.toThrow('Saved view not found');
	});
});
