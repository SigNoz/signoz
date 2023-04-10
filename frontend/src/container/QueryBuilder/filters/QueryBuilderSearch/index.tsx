import { CheckOutlined } from '@ant-design/icons';
import { Select, Spin, Tag, Tooltip, Typography } from 'antd';
import { OPERATORS } from 'constants/queryBuilder';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React from 'react';
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
		isMulti,
		isFetching,
	} = useAutoComplete(query);

	const onTagRender = ({ value }: { value: string }): React.ReactElement => {
		const [tagKey, tagOperator, ...tagValue] = value.split(' ');
		if (!tagOperator) return <div>{value}</div>;
		if (tagOperator === OPERATORS.IN || tagOperator === OPERATORS.NIN) {
			const tagTitle = `${tagKey} ${tagOperator} ${tagValue.join(', ')}`;
			return (
				<Tag closable>
					<Tooltip title={tagTitle}>
						{tagKey} {tagOperator}{' '}
						<Typography.Text ellipsis style={{ width: '3rem' }}>
							{tagValue.join(', ')}
						</Typography.Text>
					</Tooltip>
				</Tag>
			);
		}
		return (
			<Tag closable>
				<Tooltip title={value}>
					<Typography.Text ellipsis>{value}</Typography.Text>
				</Tooltip>
			</Tag>
		);
	};

	return (
		<Select
			virtual
			showSearch
			tagRender={onTagRender}
			filterOption={!isMulti}
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
				<Select.Option key={option.value} value={option.value}>
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
