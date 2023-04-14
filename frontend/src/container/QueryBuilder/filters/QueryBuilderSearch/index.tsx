import { CheckOutlined } from '@ant-design/icons';
import { Select, Spin, Tag, Tooltip, Typography } from 'antd';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React from 'react';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

import { dropdownCheckIcon, filterSelectStyle } from './config';
import { isInNotInOperator } from './utils';

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

	const onTagRender = ({
		value,
		closable,
		onClose,
	}: CustomTagProps): React.ReactElement => {
		const isInNin = isInNotInOperator(value);
		return (
			<Tag closable={closable} onClose={onClose}>
				<Tooltip title={value}>
					<Typography.Text
						ellipsis
						style={{
							width: isInNin ? '5rem' : 'auto',
						}}
					>
						{value}
					</Typography.Text>
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
			onChange={(value): void => {
				if (!isMulti) handleSearch(value[value.length - 1]);
			}}
			onDeselect={handleClearTag}
			onSelect={handleSelect}
			onInputKeyDown={(e): void => {
				if (isMulti || e.key === 'Backspace') handleKeyDown(e);
			}}
			onSearch={handleSearch}
			searchValue={searchValue}
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

export interface CustomTagProps {
	label: React.ReactNode;
	value: string;
	disabled: boolean;
	onClose: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
	closable: boolean;
}

export default QueryBuilderSearch;
