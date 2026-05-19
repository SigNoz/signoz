import { useEffect, useState } from 'react';
import { Select } from 'antd';
import { removeKeysFromExpression } from 'components/QueryBuilderV2/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { cloneDeep } from 'lodash-es';
import {
	IBuilderQuery,
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

enum SpanScope {
	ALL_SPANS = 'all_spans',
	ROOT_SPANS = 'root_spans',
	ENTRYPOINT_SPANS = 'entrypoint_spans',
}

interface SpanScopeSelectorProps {
	onChange?: (value: TagFilter) => void;
	query?: IBuilderQuery;
	skipQueryBuilderRedirect?: boolean;
}

const SPAN_FILTER_KEY: Record<SpanScope, string | null> = {
	[SpanScope.ALL_SPANS]: null,
	[SpanScope.ROOT_SPANS]: 'isRoot',
	[SpanScope.ENTRYPOINT_SPANS]: 'isEntryPoint',
};

const SCOPE_FILTER_KEYS = Object.values(SPAN_FILTER_KEY).filter(
	(key): key is string => key !== null,
);

const isScopeFilter = (filter: TagFilterItem, key: string): boolean =>
	filter.key?.key === key && String(filter.value) === 'true';

const createFilterItem = (key: string): TagFilterItem => ({
	id: uuid().slice(0, 8),
	key: {
		key,
		dataType: undefined,
		type: '',
	},
	op: '=',
	value: 'true',
});

const SELECT_OPTIONS = [
	{ value: SpanScope.ALL_SPANS, label: 'All Spans' },
	{ value: SpanScope.ROOT_SPANS, label: 'Root Spans' },
	{ value: SpanScope.ENTRYPOINT_SPANS, label: 'Entrypoint Spans' },
];

function SpanScopeSelector({
	onChange,
	query,
	skipQueryBuilderRedirect,
}: SpanScopeSelectorProps): JSX.Element {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const [selectedScope, setSelectedScope] = useState<SpanScope>(
		SpanScope.ALL_SPANS,
	);

	const getCurrentScopeFromFilters = (
		filters: TagFilterItem[] = [],
	): SpanScope => {
		const hasFilter = (key: string): boolean =>
			filters?.some((filter) => isScopeFilter(filter, key));

		if (hasFilter('isRoot')) {
			return SpanScope.ROOT_SPANS;
		}
		if (hasFilter('isEntryPoint')) {
			return SpanScope.ENTRYPOINT_SPANS;
		}
		return SpanScope.ALL_SPANS;
	};

	useEffect(() => {
		let queryData = (currentQuery?.builder?.queryData || [])?.find(
			(item) => item.queryName === query?.queryName,
		);

		if (onChange && query) {
			queryData = query;
		}

		const filters = queryData?.filters?.items;
		const currentScope = getCurrentScopeFromFilters(filters);
		setSelectedScope(currentScope);
	}, [currentQuery, onChange, query]);

	const handleScopeChange = (newScope: SpanScope): void => {
		const newQuery = cloneDeep(currentQuery);

		const getUpdatedFilters = (
			currentFilters: TagFilterItem[] = [],
			isTargetQuery: boolean,
		): TagFilterItem[] => {
			if (!isTargetQuery) {
				return currentFilters;
			}

			const nonScopeFilters = currentFilters.filter(
				(filter) =>
					!SCOPE_FILTER_KEYS.some((scopeKey) => isScopeFilter(filter, scopeKey)),
			);

			const scopeKey = SPAN_FILTER_KEY[newScope];
			const newScopeFilter = scopeKey !== null ? [createFilterItem(scopeKey)] : [];

			return [...nonScopeFilters, ...newScopeFilter];
		};

		newQuery.builder.queryData = newQuery.builder.queryData.map((item) => ({
			...item,
			filter: {
				expression: removeKeysFromExpression(
					item.filter?.expression ?? '',
					SCOPE_FILTER_KEYS,
				),
			},
			filters: {
				...item.filters,
				items: getUpdatedFilters(
					item.filters?.items,
					item.queryName === query?.queryName,
				),
				op: item.filters?.op || 'AND',
			},
		}));

		if (skipQueryBuilderRedirect && onChange && query) {
			onChange({
				...(query.filters || { items: [], op: 'AND' }),
				items: getUpdatedFilters([...(query.filters?.items || [])], true) || [],
			});

			setSelectedScope(newScope);
		} else {
			redirectWithQueryBuilderData(newQuery);
		}
	};

	return (
		<Select
			value={selectedScope}
			className="span-scope-selector"
			data-testid="span-scope-selector"
			onChange={handleScopeChange}
			options={SELECT_OPTIONS}
		/>
	);
}

SpanScopeSelector.defaultProps = {
	onChange: undefined,
	query: undefined,
	skipQueryBuilderRedirect: false,
};

export default SpanScopeSelector;
