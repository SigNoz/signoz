import { CheckOutlined } from '@ant-design/icons';
import { Select, Spin, Tag } from 'antd';
import { OPERATORS } from 'constants/queryBuilder';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React, { useCallback } from 'react';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

import { dropdownCheckIcon, filterSelectStyle } from './config';

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
		isFetching,
	} = useAutoComplete(query);

	const onTagRender = ({ value }: { value: string }): React.ReactElement => {
		const [tagKey, tagOperator, ...tagValue] = value.split(' ');
		if (!tagOperator) return <div>{value}</div>;
		if (tagOperator === OPERATORS.IN || tagOperator === OPERATORS.NIN) {
			return (
				<Tag closable>{`${tagKey} ${tagOperator} ${tagValue.join(', ')}`}</Tag>
			);
		}
		return <Tag closable>{value}</Tag>;
	};

	const getOptionClasses = useCallback(
		(selected: boolean | undefined) =>
			selected ? 'ant-select-item-option-selected select-item-option-state' : '',
		[],
	);

	return (
		<Select
			virtual
			showSearch
			tagRender={onTagRender}
			filterOption={isFilter}
			autoClearSearchValue={false}
			mode="multiple"
			placeholder="Search Filter"
			value={tags}
			disabled={!query.aggregateAttribute.key}
			style={filterSelectStyle}
			onDeselect={handleClearTag}
			onSelect={handleSelect}
			onInputKeyDown={handleKeyDown}
			onSearch={handleSearch}
			searchValue={searchValue}
			placement="topLeft"
			notFoundContent={isFetching ? <Spin size="small" /> : null}
		>
			{options?.map((option) => (
				<Select.Option
					key={option.value}
					value={option.value}
					className={getOptionClasses(option.selected)}
				>
					{option.value}
					{option.selected && <CheckOutlined style={dropdownCheckIcon} />}
				</Select.Option>
			))}
		</Select>
	);
}

interface QueryBuilderSearchProps {
	query: IBuilderQueryForm;
}

export default QueryBuilderSearch;
