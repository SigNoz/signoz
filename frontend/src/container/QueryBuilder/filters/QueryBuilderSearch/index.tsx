import { Select, Spin, Tag, Tooltip } from 'antd';
import {
	useAutoComplete,
	WhereClauseConfig,
} from 'hooks/queryBuilder/useAutoComplete';
import { useFetchKeysAndValues } from 'hooks/queryBuilder/useFetchKeysAndValues';
import {
	KeyboardEvent,
	ReactElement,
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
} from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import { selectStyle } from './config';
import { PLACEHOLDER } from './constant';
import { StyledCheckOutlined, TypographyText } from './style';
import {
	getOperatorValue,
	getRemovePrefixFromKey,
	getTagToken,
	isExistsNotExistsOperator,
	isInNInOperator,
} from './utils';

function QueryBuilderSearch({
	query,
	onChange,
	whereClauseConfig,
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
		setSearchKey,
		searchKey,
	} = useAutoComplete(query, whereClauseConfig);

	const { sourceKeys, handleRemoveSourceKey } = useFetchKeysAndValues(
		searchValue,
		query,
		searchKey,
	);

	const onTagRender = ({
		value,
		closable,
		onClose,
	}: CustomTagProps): ReactElement => {
		const { tagOperator } = getTagToken(value);
		const isInNin = isInNInOperator(tagOperator);
		const chipValue = isInNin
			? value?.trim()?.replace(/,\s*$/, '')
			: value?.trim();

		const onCloseHandler = (): void => {
			onClose();
			handleSearch('');
			setSearchKey('');
		};

		const tagEditHandler = (value: string): void => {
			updateTag(value);
			handleSearch(value);
		};

		return (
			<Tag closable={!searchValue && closable} onClose={onCloseHandler}>
				<Tooltip title={chipValue}>
					<TypographyText
						ellipsis
						$isInNin={isInNin}
						disabled={!!searchValue}
						$isEnabled={!!searchValue}
						onClick={(): void => tagEditHandler(value)}
					>
						{chipValue}
					</TypographyText>
				</Tooltip>
			</Tag>
		);
	};

	const onChangeHandler = (value: string[]): void => {
		if (!isMulti) handleSearch(value[value.length - 1]);
	};

	const onInputKeyDownHandler = (event: KeyboardEvent<Element>): void => {
		if (isMulti || event.key === 'Backspace') handleKeyDown(event);
		if (isExistsNotExistsOperator(searchValue)) handleKeyDown(event);
	};

	const handleDeselect = useCallback(
		(deselectedItem: string) => {
			handleClearTag(deselectedItem);
			handleRemoveSourceKey(deselectedItem);
		},
		[handleClearTag, handleRemoveSourceKey],
	);

	const isMetricsDataSource = useMemo(
		() => query.dataSource === DataSource.METRICS,
		[query.dataSource],
	);

	const queryTags = useMemo(() => {
		if (!query.aggregateAttribute.key && isMetricsDataSource) return [];
		return tags;
	}, [isMetricsDataSource, query.aggregateAttribute.key, tags]);

	useEffect(() => {
		const initialTagFilters: TagFilter = { items: [], op: 'AND' };
		const initialSourceKeys = query.filters.items.map(
			(item) => item.key as BaseAutocompleteData,
		);
		initialTagFilters.items = tags.map((tag) => {
			const { tagKey, tagOperator, tagValue } = getTagToken(tag);
			const filterAttribute = [...initialSourceKeys, ...sourceKeys].find(
				(key) => key.key === getRemovePrefixFromKey(tagKey),
			);
			return {
				id: uuid().slice(0, 8),
				key: filterAttribute ?? {
					key: tagKey,
					dataType: null,
					type: null,
					isColumn: null,
				},
				op: getOperatorValue(tagOperator),
				value:
					tagValue[tagValue.length - 1] === ''
						? tagValue?.slice(0, -1)
						: tagValue ?? '',
			};
		});
		onChange(initialTagFilters);
		/* eslint-disable react-hooks/exhaustive-deps */
	}, [sourceKeys]);

	return (
		<Select
			virtual
			showSearch
			tagRender={onTagRender}
			filterOption={false}
			autoClearSearchValue={false}
			mode="multiple"
			placeholder={PLACEHOLDER}
			value={queryTags}
			searchValue={searchValue}
			disabled={isMetricsDataSource && !query.aggregateAttribute.key}
			style={selectStyle}
			onSearch={handleSearch}
			onChange={onChangeHandler}
			onSelect={handleSelect}
			onDeselect={handleDeselect}
			onInputKeyDown={onInputKeyDownHandler}
			notFoundContent={isFetching ? <Spin size="small" /> : null}
		>
			{options.map((option) => (
				<Select.Option key={option.label} value={option.value}>
					{option.label}
					{option.selected && <StyledCheckOutlined />}
				</Select.Option>
			))}
		</Select>
	);
}

interface QueryBuilderSearchProps {
	query: IBuilderQuery;
	onChange: (value: TagFilter) => void;
	whereClauseConfig?: WhereClauseConfig;
}

QueryBuilderSearch.defaultProps = {
	whereClauseConfig: undefined,
};

export interface CustomTagProps {
	label: ReactNode;
	value: string;
	disabled: boolean;
	onClose: () => void;
	closable: boolean;
}

export default QueryBuilderSearch;
