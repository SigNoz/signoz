import './QueryBuilderSearchV2.styles.scss';

import { Input, Popover, Typography } from 'antd';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useGetAggregateKeys } from 'hooks/queryBuilder/useGetAggregateKeys';
import useDebounceValue from 'hooks/useDebounce';
import { useEffect, useMemo, useState } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import Suggestions from './Suggestions';

export interface Tag {
	key: BaseAutocompleteData;
	operator: string;
	value: string;
}

interface QueryBuilderSearchV2Props {
	query: IBuilderQuery;
	onChange: (value: TagFilter) => void;
}

function getInitTags(query: IBuilderQuery): Tag[] {
	return query.filters.items.map((item) => ({
		// TODO check why this is optional
		key: item.key as BaseAutocompleteData,
		operator: item.op,
		value: `${item.value}`,
	}));
}

function QueryBuilderSearchV2(
	props: QueryBuilderSearchV2Props,
): React.ReactElement {
	const { query, onChange } = props;

	// create the tags from the initial query here, this should only be computed on the first load as post that tags and query will be always in sync.
	const [tags, setTags] = useState<Tag[]>(() => getInitTags(query));

	// this will maintain the current state of in process filter item
	const [currentFilterItem, setCurrentFilterItem] = useState<Tag | undefined>();

	// to maintain the current running state until the tokenization happens
	const [searchValue, setSearchValue] = useState<string>('');

	const memoizedSearchParams = useMemo(
		() => [
			// TODO update the search value here as well based on the running state of the filter
			searchValue,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute.key,
		],
		[
			searchValue,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute.key,
		],
	);

	const searchParams = useDebounceValue(memoizedSearchParams, DEBOUNCE_DELAY);

	const isQueryEnabled = useMemo(
		() =>
			query.dataSource === DataSource.METRICS
				? !!query.aggregateOperator &&
				  !!query.dataSource &&
				  !!query.aggregateAttribute.dataType
				: true,
		[
			query.aggregateAttribute.dataType,
			query.aggregateOperator,
			query.dataSource,
		],
	);

	const { data, isFetching, status } = useGetAggregateKeys(
		{
			// TODO : this should be dependent on what is the current running state for the filter
			searchText: searchValue,
			dataSource: query.dataSource,
			aggregateOperator: query.aggregateOperator,
			aggregateAttribute: query.aggregateAttribute.key,
			tagType: query.aggregateAttribute.type ?? null,
		},
		{
			queryKey: [searchParams],
			enabled: isQueryEnabled,
		},
	);

	// the aim of this use effect is to do the tokenisation once the search value has been updated
	useEffect(() => {
		// all the tokenisation logic goes here based on the keys fetched above
	}, [searchValue]);

	return (
		<div className="query-builder-search-v2">
			<section className="tags">
				{tags?.map((tag) => (
					<div className="tag" key={tag.key.id}>
						<Typography.Text>{`${tag.key.key} ${tag.operator} ${tag.value}`}</Typography.Text>
					</div>
				))}
			</section>
			<section className="search-bar">
				<Popover
					trigger="focus"
					arrow={false}
					placement="bottom"
					content={
						<Suggestions
							searchValue={searchValue}
							currentFilterItem={currentFilterItem}
						/>
					}
				>
					<Input
						placeholder='Search Filter : select options from suggested values, for IN/NOT IN operators - press "Enter" after selecting options'
						value={searchValue}
						onChange={(event): void => {
							setSearchValue(event.target.value);
						}}
					/>
				</Popover>
			</section>
		</div>
	);
}

export default QueryBuilderSearchV2;
