import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useClickOutside from 'hooks/useClickOutside';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { resourceAttributesToTracesFilterItems } from 'hooks/useResourceAttribute/utils';
import createQueryParams from 'lib/createQueryParams';
import { prepareQueryWithDefaultTimestamp } from 'pages/LogsExplorer/utils';
import { traceFilterKeys } from 'pages/TracesExplorer/Filter/filterUtils';
import { Dispatch, SetStateAction, useMemo, useRef } from 'react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	Query,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { Tags } from 'types/reducer/trace';
import { secondsToMilliseconds } from 'utils/timeUtils';
import { v4 as uuid } from 'uuid';

export const dbSystemTags: Tags[] = [
	{
		Key: 'db.system.(string)',
		StringValues: [''],
		NumberValues: [],
		BoolValues: [],
		Operator: 'Exists',
	},
];

interface OnViewTracePopupClickProps {
	servicename: string | undefined;
	selectedTraceTags: string;
	timestamp: number;
	apmToTraceQuery: Query;
	isViewLogsClicked?: boolean;
	stepInterval?: number;
	safeNavigate: (url: string) => void;
}

interface OnViewAPIMonitoringPopupClickProps {
	servicename: string;
	timestamp: number;
	stepInterval?: number;
	domainName: string;
	isError: boolean;

	safeNavigate: (url: string) => void;
}

export function generateExplorerPath(
	isViewLogsClicked: boolean | undefined,
	urlParams: URLSearchParams,
	servicename: string | undefined,
	selectedTraceTags: string,
	JSONCompositeQuery: string,
	queryString: string[],
): string {
	const basePath = isViewLogsClicked
		? ROUTES.LOGS_EXPLORER
		: ROUTES.TRACES_EXPLORER;

	return `${basePath}?${urlParams.toString()}&selected={"serviceName":["${servicename}"]}&filterToFetchData=["duration","status","serviceName"]&spanAggregateCurrentPage=1&selectedTags=${selectedTraceTags}&${
		QueryParams.compositeQuery
	}=${JSONCompositeQuery}&${queryString.join('&')}`;
}

// TODO(@rahul-signoz): update the name of this function once we have view logs button in every panel

/**
 * Handles click events for viewing trace/logs popup
 * @param selectedTraceTags - Selected trace tags
 * @param servicename - Name of the service
 * @param timestamp - Timestamp in seconds
 * @param apmToTraceQuery - Query object
 * @param isViewLogsClicked - Whether this is for viewing logs vs traces
 * @param stepInterval - Time interval in seconds
 * @param safeNavigate - Navigation function
 
 */
export function onViewTracePopupClick({
	selectedTraceTags,
	servicename,
	timestamp,
	apmToTraceQuery,
	isViewLogsClicked,
	stepInterval,
	safeNavigate,
}: OnViewTracePopupClickProps): VoidFunction {
	return (): void => {
		const endTime = secondsToMilliseconds(timestamp);
		const startTime = secondsToMilliseconds(timestamp - (stepInterval || 60));

		const urlParams = new URLSearchParams(window.location.search);
		urlParams.set(QueryParams.startTime, startTime.toString());
		urlParams.set(QueryParams.endTime, endTime.toString());
		urlParams.delete(QueryParams.relativeTime);
		const avialableParams = routeConfig[ROUTES.TRACE];
		const queryString = getQueryString(avialableParams, urlParams);

		const JSONCompositeQuery = encodeURIComponent(
			JSON.stringify(apmToTraceQuery),
		);

		const newPath = generateExplorerPath(
			isViewLogsClicked,
			urlParams,
			servicename,
			selectedTraceTags,
			JSONCompositeQuery,
			queryString,
		);

		safeNavigate(newPath);
	};
}

const generateAPIMonitoringPath = (
	domainName: string,
	startTime: number,
	endTime: number,
	filters: IBuilderQuery['filters'],
): string => {
	const basePath = ROUTES.API_MONITORING;
	return `${basePath}?${createQueryParams({
		apiMonitoringParams: JSON.stringify({
			selectedDomain: domainName,
			selectedView: 'endpoint_stats',
			modalTimeRange: {
				startTime,
				endTime,
			},
			selectedInterval: 'custom',
			endPointDetailsLocalFilters: filters,
		}),
	})}`;
};
export function onViewAPIMonitoringPopupClick({
	servicename,
	timestamp,
	domainName,
	isError,
	stepInterval,
	safeNavigate,
}: OnViewAPIMonitoringPopupClickProps): VoidFunction {
	return (): void => {
		const endTime = timestamp + (stepInterval || 60);
		const startTime = timestamp - (stepInterval || 60);
		const filters = {
			items: [
				...(isError
					? [
							{
								id: uuid().slice(0, 8),
								key: {
									key: 'hasError',
									dataType: DataTypes.bool,
									type: 'tag',
									id: 'hasError--bool--tag--true',
								},
								op: 'in',
								value: ['true'],
							},
					  ]
					: []),
				{
					id: uuid().slice(0, 8),
					key: {
						key: 'service.name',
						dataType: DataTypes.String,
						type: 'resource',
					},
					op: '=',
					value: servicename,
				},
			],
			op: 'AND',
		};
		const newPath = generateAPIMonitoringPath(
			domainName,
			startTime,
			endTime,
			filters,
		);

		safeNavigate(newPath);
	};
}

export function useGraphClickHandler(
	setSelectedTimeStamp: (n: number) => void | Dispatch<SetStateAction<number>>,
	setSelectedData?: (data: any) => void | Dispatch<SetStateAction<any>>,
): (
	xValue: number,
	yValue: number,
	mouseX: number,
	mouseY: number,
	type: string,
	data?: any,
) => Promise<void> {
	const buttonRef = useRef<HTMLElement | null>(null);

	useClickOutside({
		ref: buttonRef,
		onClickOutside: () => {
			if (buttonRef.current) {
				buttonRef.current.style.display = 'none';
			}
		},
		eventType: 'mousedown',
	});

	return async (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
		type: string,
		data?: any,
	): Promise<void> => {
		const id = `${type}_button`;
		const buttonElement = document.getElementById(id);
		buttonRef.current = buttonElement;

		if (xValue) {
			if (buttonElement) {
				buttonElement.style.display = 'block';
				buttonElement.style.left = `${mouseX}px`;
				buttonElement.style.top = `${mouseY}px`;
				setSelectedTimeStamp(Math.floor(xValue));
				if (setSelectedData && data) {
					setSelectedData(data);
				}
			}
		} else if (buttonElement && buttonElement.style.display === 'block') {
			buttonElement.style.display = 'none';
		}
	};
}

export const handleNonInQueryRange = (tags: TagFilterItem[]): TagFilterItem[] =>
	tags.map((tag) => {
		if (tag.op === 'Not IN') {
			return {
				...tag,
				op: 'NIN',
			};
		}
		return tag;
	});

export function handleQueryChange(
	query: Query,
	attributeKeys: BaseAutocompleteData,
	serviceAttribute: string,
	filters?: TagFilterItem[],
	logs?: boolean,
): Query {
	const filterItem: TagFilterItem[] = [
		{
			id: uuid().slice(0, 8),
			key: attributeKeys,
			op: logs ? '=' : 'in',
			value: serviceAttribute,
		},
	];
	return {
		...query,
		builder: {
			...query.builder,
			queryData: query.builder.queryData?.map((item) => ({
				...item,
				filters: {
					...item.filters,
					items: [...(item.filters?.items || []), ...filterItem, ...(filters || [])],
					op: item.filters?.op || 'AND',
				},
			})),
		},
	};
}

export function useGetAPMToLogsQueries({
	servicename,
	filters,
}: {
	servicename: string;
	filters?: TagFilterItem[];
}): Query {
	const finalFilters: TagFilterItem[] = [];
	const { updateAllQueriesOperators } = useQueryBuilder();
	let updatedQuery = updateAllQueriesOperators(
		initialQueriesMap.logs,
		PANEL_TYPES.LIST,
		DataSource.LOGS,
	);
	const serviceName = {
		id: 'service.name--string--resource--true',
		dataType: DataTypes.String,
		key: 'service.name',
		type: 'resource',
	};

	if (filters?.length) {
		finalFilters.push(...filters);
	}
	updatedQuery = prepareQueryWithDefaultTimestamp(updatedQuery);
	return handleQueryChange(
		updatedQuery,
		serviceName,
		servicename,
		finalFilters,
		true,
	);
}

export function useGetAPMToTracesQueries({
	servicename,
	isExternalCall,
	isDBCall,
	filters,
}: {
	servicename: string;
	isExternalCall?: boolean;
	isDBCall?: boolean;
	filters?: TagFilterItem[];
}): Query {
	const { updateAllQueriesOperators } = useQueryBuilder();
	const { queries } = useResourceAttribute();

	const resourceAttributesFilters = useMemo(
		() => resourceAttributesToTracesFilterItems(queries),
		[queries],
	);
	const finalFilters: TagFilterItem[] = [];
	let spanKindFilter: TagFilterItem;
	let dbCallFilter: TagFilterItem;

	if (isExternalCall) {
		spanKindFilter = {
			id: uuid().slice(0, 8),
			key: {
				key: 'spanKind',
				dataType: DataTypes.String,
				type: 'tag',
				id: 'spanKind--string--tag--true',
			},
			op: '=',
			value: 'Client',
		};
		finalFilters.push(spanKindFilter);
	}

	if (isDBCall) {
		dbCallFilter = {
			id: uuid().slice(0, 8),
			key: {
				key: 'dbSystem',
				dataType: DataTypes.String,
				type: 'tag',
				id: 'dbSystem--string--tag--true',
			},
			op: 'exists',
			value: '',
		};
		finalFilters.push(dbCallFilter);
	}

	if (filters?.length) {
		finalFilters.push(...filters);
	}

	if (resourceAttributesFilters?.length) {
		finalFilters.push(...resourceAttributesFilters);
	}

	return useMemo(() => {
		const updatedQuery = updateAllQueriesOperators(
			initialQueriesMap.traces,
			PANEL_TYPES.TRACE,
			DataSource.TRACES,
		);

		return handleQueryChange(
			updatedQuery,
			traceFilterKeys.serviceName,
			servicename,
			finalFilters,
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [servicename, queries, updateAllQueriesOperators]);
}
