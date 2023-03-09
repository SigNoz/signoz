import { SearchOutlined } from '@ant-design/icons';
import { Button, Select, Space } from 'antd';
import { QUERY_BUILDER_STATE_KEYS } from 'constants/queryBuilder';
import { useQueryBuilderContext } from 'container/QueryBuilder';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React, { useEffect } from 'react';

import { Tag } from './tag';

function QueryBuilderSearch(): JSX.Element {
	const { onChangeHandler, onSubmitHandler } = useQueryBuilderContext();
	const { Option } = Select;

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

	return (
		<Space.Compact block>
			<Select
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
				style={{ width: '100%' }}
			>
				{options.map((o) => (
					<Option
						key={o.value}
						value={o.value}
						className={
							o.selected
								? 'ant-select-item-option-selected select-item-option-state'
								: ''
						}
					>
						{o.value}
					</Option>
				))}
			</Select>
			<Button icon={<SearchOutlined />} onClick={onSubmitHandler} />
		</Space.Compact>
	);
}

export default QueryBuilderSearch;
