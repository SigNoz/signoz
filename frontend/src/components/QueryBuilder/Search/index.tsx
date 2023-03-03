import { SearchOutlined } from '@ant-design/icons';
import { Button, Select, Space } from 'antd';
import { QUERY_BUILDER_STATE_KEYS } from 'constants/queryBuilder';
import { useQueryBuilderContext } from 'container/QueryBuilder';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React, { useEffect } from 'react';

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
	} = useAutoComplete();

	useEffect(() => {
		onChangeHandler(QUERY_BUILDER_STATE_KEYS.SEARCH)(tags.join('AND'));
	}, [onChangeHandler, tags]);

	return (
		<Space.Compact block>
			<Select
				showSearch
				autoClearSearchValue={false}
				mode="multiple"
				options={options}
				placeholder="Search Filter"
				value={tags}
				onDeselect={handleClearTag}
				onSelect={handleSelect}
				onInputKeyDown={handleKeyDown}
				onSearch={handleSearch}
				searchValue={searchValue}
				style={{ width: '100%' }}
			/>
			<Button icon={<SearchOutlined />} onClick={onSubmitHandler} />
		</Space.Compact>
	);
}

export default QueryBuilderSearch;
