import { Select, Tag } from 'antd';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React, { useCallback } from 'react';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import { filterSelectStyle } from './config';

function QueryBuilderSearch({ query }: QueryBuilderSearchProps): JSX.Element {
	const {
		handleClearTag,
		handleKeyDown,
		handleSearch,
		handleSelect,
		tags,
		options,
		searchValue,
		isFilter,
	} = useAutoComplete(query);

	const onTagRender = ({ value }: { value: string }): React.ReactElement => (
		<Tag closable>{value}</Tag>
	);

	const getOptionClasses = useCallback(
		(selected: boolean | undefined) =>
			selected ? 'ant-select-item-option-selected select-item-option-state' : '',
		[],
	);

	return (
		<Select
			showSearch
			tagRender={onTagRender}
			filterOption={isFilter}
			autoClearSearchValue={false}
			mode="multiple"
			placeholder="Search Filter"
			value={tags}
			disabled={!query.aggregateAttribute}
			style={filterSelectStyle}
			onDeselect={handleClearTag}
			onSelect={handleSelect}
			onInputKeyDown={handleKeyDown}
			onSearch={handleSearch}
			searchValue={searchValue}
		>
			{options?.map((option) => (
				<Select.Option
					key={option.value}
					value={option.value}
					className={getOptionClasses(option.selected)}
				>
					{option.value}
				</Select.Option>
			))}
		</Select>
	);
}

interface QueryBuilderSearchProps {
	query: IBuilderQuery;
}

export default QueryBuilderSearch;
