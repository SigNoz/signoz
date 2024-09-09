import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { routeConfig } from 'container/SideNav/config';
import { getQueryString } from 'container/SideNav/helper';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { resourceAttributesToTracesFilterItems } from 'hooks/useResourceAttribute/utils';
import history from 'lib/history';
import { traceFilterKeys } from 'pages/TracesExplorer/Filter/filterUtils';
import { Dispatch, SetStateAction, useMemo } from 'react';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query, TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { Tags } from 'types/reducer/trace';
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
}
export function onViewTracePopupClick({
	selectedTraceTags,
	servicename,
	timestamp,
	apmToTraceQuery,
}: OnViewTracePopupClickProps): VoidFunction {
	return (): void => {
		const currentTime = timestamp;

		const tPlusOne = timestamp + 60;

		const urlParams = new URLSearchParams(window.location.search);
		urlParams.set(QueryParams.startTime, currentTime.toString());
		urlParams.set(QueryParams.endTime, tPlusOne.toString());
		const avialableParams = routeConfig[ROUTES.TRACE];
		const queryString = getQueryString(avialableParams, urlParams);

		const JSONCompositeQuery = encodeURIComponent(
			JSON.stringify(apmToTraceQuery),
		);

		const newTraceExplorerPath = `${
			ROUTES.TRACES_EXPLORER
		}?${urlParams.toString()}&selected={"serviceName":["${servicename}"]}&filterToFetchData=["duration","status","serviceName"]&spanAggregateCurrentPage=1&selectedTags=${selectedTraceTags}&${
			QueryParams.compositeQuery
		}=${JSONCompositeQuery}&${queryString.join('&')}`;

		history.push(newTraceExplorerPath);
	};
}

export function onGraphClickHandler(
	setSelectedTimeStamp: (n: number) => void | Dispatch<SetStateAction<number>>,
) {
	return async (
		xValue: number,
		yValue: number,
		mouseX: number,
		mouseY: number,
		type: string,
	): Promise<void> => {
		const id = `${type}_button`;

		const buttonElement = document.getElementById(id);

		if (xValue) {
			if (buttonElement) {
				buttonElement.style.display = 'block';
				buttonElement.style.left = `${mouseX}px`;
				buttonElement.style.top = `${mouseY}px`;
				setSelectedTimeStamp(xValue);
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
): Query {
	const filterItem: TagFilterItem[] = [
		{
			id: uuid().slice(0, 8),
			key: attributeKeys,
			op: 'in',
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
					items: [...item.filters.items, ...filterItem, ...(filters || [])],
				},
			})),
		},
	};
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
				isColumn: true,
				isJSON: false,
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
				isColumn: true,
				isJSON: false,
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
	}, [servicename, updateAllQueriesOperators]);
}
