import { Select } from 'antd';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { cloneDeep } from 'lodash-es';
import { useEffect, useState } from 'react';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

enum SpanScope {
	ALL_SPANS = 'all_spans',
	ROOT_SPANS = 'root_spans',
	ENTRYPOINT_SPANS = 'entrypoint_spans',
}

interface SpanFilterConfig {
	key: string;
	type: string;
}

interface SpanScopeSelectorProps {
	queryName: string;
}

const SPAN_FILTER_CONFIG: Record<SpanScope, SpanFilterConfig | null> = {
	[SpanScope.ALL_SPANS]: null,
	[SpanScope.ROOT_SPANS]: {
		key: 'isRoot',
		type: 'spanSearchScope',
	},
	[SpanScope.ENTRYPOINT_SPANS]: {
		key: 'isEntryPoint',
		type: 'spanSearchScope',
	},
};

const createFilterItem = (config: SpanFilterConfig): TagFilterItem => ({
	id: uuid().slice(0, 8),
	key: {
		key: config.key,
		dataType: undefined,
		isColumn: false,
		type: config?.type,
	},
	op: '=',
	value: 'true',
});

const SELECT_OPTIONS = [
	{ value: SpanScope.ALL_SPANS, label: 'All Spans' },
	{ value: SpanScope.ROOT_SPANS, label: 'Root Spans' },
	{ value: SpanScope.ENTRYPOINT_SPANS, label: 'Entrypoint Spans' },
];

function SpanScopeSelector({ queryName }: SpanScopeSelectorProps): JSX.Element {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const [selectedScope, setSelectedScope] = useState<SpanScope>(
		SpanScope.ALL_SPANS,
	);

	const getCurrentScopeFromFilters = (
		filters: TagFilterItem[] = [],
	): SpanScope => {
		const hasFilter = (key: string): boolean =>
			filters.some(
				(filter) =>
					filter.key?.type === 'spanSearchScope' &&
					filter.key.key === key &&
					filter.value === 'true',
			);

		if (hasFilter('isRoot')) return SpanScope.ROOT_SPANS;
		if (hasFilter('isEntryPoint')) return SpanScope.ENTRYPOINT_SPANS;
		return SpanScope.ALL_SPANS;
	};

	useEffect(() => {
		const queryData = currentQuery.builder.queryData.find(
			(item) => item.queryName === queryName,
		);
		const filters = queryData?.filters?.items;
		const currentScope = getCurrentScopeFromFilters(filters);
		setSelectedScope(currentScope);
	}, [currentQuery, queryName]);

	const handleScopeChange = (newScope: SpanScope): void => {
		const newQuery = cloneDeep(currentQuery);

		const getUpdatedFilters = (
			currentFilters: TagFilterItem[] = [],
			isTargetQuery: boolean,
		): TagFilterItem[] => {
			if (!isTargetQuery) return currentFilters;

			const nonScopeFilters = currentFilters.filter(
				(filter) =>
					!(
						filter.key?.type === 'spanSearchScope' &&
						(filter.key.key === 'isRoot' || filter.key.key === 'isEntryPoint')
					),
			);

			const config = SPAN_FILTER_CONFIG[newScope];
			const newScopeFilter = config !== null ? [createFilterItem(config)] : [];

			return [...nonScopeFilters, ...newScopeFilter];
		};

		newQuery.builder.queryData = newQuery.builder.queryData.map((item) => ({
			...item,
			filters: {
				...item.filters,
				items: getUpdatedFilters(item.filters?.items, item.queryName === queryName),
			},
		}));

		redirectWithQueryBuilderData(newQuery);
	};

	//
	return (
		<Select
			value={selectedScope}
			className="span-scope-selector"
			onChange={handleScopeChange}
			options={SELECT_OPTIONS}
		/>
	);
}

export default SpanScopeSelector;
