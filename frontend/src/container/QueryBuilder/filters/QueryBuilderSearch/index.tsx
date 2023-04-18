import { Select, Spin, Tag, Tooltip } from 'antd';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React from 'react';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';

import { selectStyle } from './config';
import { StyledCheckOutlined, TypographyText } from './style';
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

		const onCloseHandler = (): void => {
			onClose();
			handleSearch('');
		};

		return (
			<Tag closable={closable} onClose={onCloseHandler}>
				<Tooltip title={value}>
					<TypographyText ellipsis $isInNin={isInNin}>
						{value}
					</TypographyText>
				</Tooltip>
			</Tag>
		);
	};

	const onChangeHandler = (value: string[]): void => {
		if (!isMulti) handleSearch(value[value.length - 1]);
	};

	const onInputKeyDownHandler = (event: React.KeyboardEvent<Element>): void => {
		if (isMulti || event.key === 'Backspace') handleKeyDown(event);
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
			searchValue={searchValue}
			disabled={!query.aggregateAttribute.key}
			style={selectStyle}
			onSearch={handleSearch}
			onChange={onChangeHandler}
			onSelect={handleSelect}
			onDeselect={handleClearTag}
			onInputKeyDown={onInputKeyDownHandler}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
		>
			{options?.map((option) => (
				<Select.Option key={option.value} value={option.value}>
					{option.value}
					{option.selected && <StyledCheckOutlined />}
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
