import { SearchOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { QUERY_BUILDER_STATE_KEYS } from 'constants/queryBuilder';
import { useQueryBuilderContext } from 'container/QueryBuilder';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React, { useCallback, useEffect } from 'react';

import { SelectStyled, Tag } from './styles';

function QueryBuilderSearch(): JSX.Element {
	const { onChangeHandler, onSubmitHandler } = useQueryBuilderContext();

	const {
		handleClearTag,
		handleKeyDown,
		handleSearch,
		handleSelect,
		tags,
		options,
		searchValue,
		isFilter,
	} = useAutoComplete();

	useEffect(() => {
		onChangeHandler(QUERY_BUILDER_STATE_KEYS.SEARCH)(tags.join('AND'));
	}, [onChangeHandler, tags]);

	const onTagRender = ({ value }: { value: string }): React.ReactElement => (
		<Tag closable>{value}</Tag>
	);

	const getOptionClasses = useCallback(
		(selected: boolean | undefined) =>
			selected ? 'ant-select-item-option-selected select-item-option-state' : '',
		[],
	);

	return (
		<Space.Compact block>
			<SelectStyled
				showSearch
				tagRender={onTagRender}
				filterOption={isFilter}
				autoClearSearchValue={false}
				mode="multiple"
				placeholder="Search Filter"
				value={tags}
				onDeselect={handleClearTag}
				onSelect={handleSelect}
				onInputKeyDown={handleKeyDown}
				onSearch={handleSearch}
				searchValue={searchValue}
			>
				{options.map((option) => (
					<SelectStyled.Option
						key={option.value}
						value={option.value}
						className={getOptionClasses(option.selected)}
					>
						{option.value}
					</SelectStyled.Option>
				))}
			</SelectStyled>
			<Button icon={<SearchOutlined />} onClick={onSubmitHandler} />
		</Space.Compact>
	);
}

export default QueryBuilderSearch;
