import { SearchOutlined } from '@ant-design/icons';
import { Button, Select, Space } from 'antd';
import { QUERY_BUILDER_STATE_KEYS } from 'constants/queryBuilder';
import { useQueryBuilderContext } from 'container/QueryBuilder';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React, { useEffect } from 'react';

function QueryBuilderSearch(): JSX.Element {
	const { handleChangeValue, handleSubmit } = useQueryBuilderContext();

	const {
		handleClear,
		handleKeyDown,
		handleSearch,
		handleSelect,
		tags,
		options,
		searchValue,
	} = useAutoComplete();

	useEffect(() => {
		handleChangeValue(QUERY_BUILDER_STATE_KEYS.SEARCH)(tags.join('AND'));
	}, [handleChangeValue, tags]);

	return (
		<Space.Compact block>
			<Select
				showSearch
				autoClearSearchValue={false}
				mode="multiple"
				options={options}
				placeholder="Search Filter"
				value={tags}
				onDeselect={handleClear}
				onSelect={handleSelect}
				onInputKeyDown={handleKeyDown}
				onSearch={handleSearch}
				searchValue={searchValue}
				style={{ width: '100%' }}
			/>
			<Button icon={<SearchOutlined />} onClick={handleSubmit} />
		</Space.Compact>
	);
}

export default QueryBuilderSearch;
