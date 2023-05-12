import { Select, Spin, Tag, Tooltip } from 'antd';
import { useAutoComplete } from 'hooks/queryBuilder/useAutoComplete';
import React, { useEffect, useMemo } from 'react';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

import { selectStyle } from './config';
import { StyledCheckOutlined, TypographyText } from './style';
import { isInNotInOperator } from './utils';

function QueryBuilderSearch({
	query,
	onChange,
}: QueryBuilderSearchProps): JSX.Element {
	const {
		updateTag,
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

		const tagEditHandler = (value: string): void => {
			updateTag(value);
			handleSearch(value);
		};

		return (
			<Tag closable={closable} onClose={onCloseHandler}>
				<Tooltip title={value}>
					<TypographyText
						ellipsis
						$isInNin={isInNin}
						onClick={(): void => tagEditHandler(value)}
					>
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

	const queryTags = useMemo(() => {
		if (!query.aggregateAttribute.key) return [];
		return tags;
	}, [query.aggregateAttribute.key, tags]);

	useEffect(() => {
		const initialTagFilters: TagFilter = { items: [], op: 'AND' };
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		initialTagFilters.items = tags.map((tag) => {
			const [tagKey, tagOperator, ...tagValue] = tag.split(' ');
			return {
				id: uuid().slice(0, 8),
				// TODO: key should be fixed by Chintan Sudani
				key: tagKey,
				op: tagOperator,
				value: tagValue.map((i) => i.replace(',', '')),
			};
		});
		onChange(initialTagFilters);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tags]);

	return (
		<Select
			virtual
			showSearch
			tagRender={onTagRender}
			filterOption={!isMulti}
			autoClearSearchValue={false}
			mode="multiple"
			placeholder="Search Filter"
			value={queryTags}
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
	query: IBuilderQuery;
	onChange: (value: TagFilter) => void;
}

export interface CustomTagProps {
	label: React.ReactNode;
	value: string;
	disabled: boolean;
	onClose: (event?: React.MouseEvent<HTMLElement, MouseEvent>) => void;
	closable: boolean;
}

export default QueryBuilderSearch;
