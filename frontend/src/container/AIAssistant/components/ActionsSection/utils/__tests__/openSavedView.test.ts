import {
	ApplyFilterSignalDTO,
	MessageActionKindDTO,
	SavedViewEntityDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { getAllViews } from 'api/saveView/getAllViews';
import { getViewById } from 'api/saveView/getViewById';
import ROUTES from 'constants/routes';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';
import { AllViewsProps, ViewProps } from 'types/api/saveViews/types';
import { DataSource } from 'types/common/queryBuilder';
import { AxiosResponse } from 'axios';
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

jest.mock('api/saveView/getAllViews');
jest.mock('api/saveView/getViewById');

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

const mockedGetAllViews = getAllViews as jest.MockedFunction<
	typeof getAllViews
>;
const mockedGetViewById = getViewById as jest.MockedFunction<
	typeof getViewById
>;

function makeView(id: string, sourcePage: DataSource): ViewProps {
	return {
		id,
		name: `View ${id}`,
		category: 'test',
		createdAt: '2021-07-07T06:31:00.000Z',
		createdBy: 'user',
		updatedAt: '2021-07-07T06:33:00.000Z',
		updatedBy: 'user',
		sourcePage,
		tags: [],
		extraData: '',
		compositeQuery: {
			panelType: PANEL_TYPES.LIST,
		} as ICompositeMetricQuery,
	};
}

function mockViewsResponse(views: ViewProps[]): AxiosResponse<AllViewsProps> {
	return {
		data: { status: 'success', data: views },
	} as AxiosResponse<AllViewsProps>;
}

function mockViewByIdResponse(
	view: ViewProps,
): AxiosResponse<{ status: string; data: ViewProps }> {
	return {
		data: { status: 'success', data: view },
	} as AxiosResponse<{ status: string; data: ViewProps }>;
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
		mockedGetAllViews.mockReset();
	});

	it('loads only the hinted source when entity is provided', async () => {
		const tracesView = makeView('view-traces', DataSource.TRACES);
		mockedGetAllViews.mockResolvedValueOnce(mockViewsResponse([tracesView]));

		const result = await findSavedViewInLists('view-traces', DataSource.TRACES);

		expect(result).toStrictEqual(tracesView);
		expect(mockedGetAllViews).toHaveBeenCalledTimes(1);
		expect(mockedGetAllViews).toHaveBeenCalledWith(DataSource.TRACES);
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
		const view = makeView('view-logs', DataSource.LOGS);

		openSavedView(view, history);

		expect(push).toHaveBeenCalledTimes(1);
		const pushedUrl = push.mock.calls[0][0] as string;
		expect(pushedUrl).toContain(ROUTES.LOGS_EXPLORER);
		expect(pushedUrl).toContain(QueryParams.viewKey);
	});
});

describe('openSavedViewByKey', () => {
	beforeEach(() => {
		mockedGetAllViews.mockReset();
		mockedGetViewById.mockReset();
	});

	it('prefers the direct view lookup endpoint', async () => {
		const view = makeView('view-logs', DataSource.LOGS);
		mockedGetViewById.mockResolvedValueOnce(mockViewByIdResponse(view));
		const push = jest.fn();
		const history = { push } as unknown as History;

		await openSavedViewByKey('view-logs', DataSource.LOGS, history);

		expect(mockedGetViewById).toHaveBeenCalledWith('view-logs');
		expect(mockedGetAllViews).not.toHaveBeenCalled();
		expect(push).toHaveBeenCalled();
	});

	it('falls back to list probing when direct lookup fails', async () => {
		const view = makeView('view-traces', DataSource.TRACES);
		mockedGetViewById.mockRejectedValueOnce(new Error('not found'));
		mockedGetAllViews.mockResolvedValueOnce(mockViewsResponse([view]));
		const push = jest.fn();
		const history = { push } as unknown as History;

		await openSavedViewByKey('view-traces', DataSource.TRACES, history);

		expect(mockedGetAllViews).toHaveBeenCalledWith(DataSource.TRACES);
		expect(push).toHaveBeenCalled();
	});

	it('throws when the saved view does not exist', async () => {
		mockedGetViewById.mockRejectedValueOnce(new Error('not found'));
		mockedGetAllViews.mockResolvedValue(mockViewsResponse([]));

		await expect(
			openSavedViewByKey('missing', DataSource.LOGS, {
				push: jest.fn(),
			} as unknown as History),
		).rejects.toThrow('Saved view not found');
	});
});
