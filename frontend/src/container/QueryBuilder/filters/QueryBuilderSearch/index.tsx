/* eslint-disable react/no-unstable-nested-components */
import './QueryBuilderSearch.styles.scss';

import { Button, Select, Spin, Tag, Tooltip, Typography } from 'antd';
import cx from 'classnames';
import { OPERATORS } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { LogsExplorerShortcuts } from 'constants/shortcuts/logsExplorerShortcuts';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import { getDataTypes } from 'container/LogDetailedView/utils';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import {
	useAutoComplete,
	WhereClauseConfig,
} from 'hooks/queryBuilder/useAutoComplete';
import { useFetchKeysAndValues } from 'hooks/queryBuilder/useFetchKeysAndValues';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { isEqual, isUndefined } from 'lodash-es';
import {
	ArrowDown,
	ArrowUp,
	ChevronDown,
	ChevronUp,
	Command,
	CornerDownLeft,
	Filter,
	Slash,
} from 'lucide-react';
import type { BaseSelectRef } from 'rc-select';
import {
	KeyboardEvent,
	ReactElement,
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';
import { popupContainer } from 'utils/selectPopupContainer';
import { v4 as uuid } from 'uuid';

import { selectStyle } from './config';
import { PLACEHOLDER } from './constant';
import ExampleQueriesRendererForLogs from './ExampleQueriesRendererForLogs';
import OptionRenderer from './OptionRenderer';
import OptionRendererForLogs from './OptionRendererForLogs';
import SpanScopeSelector from './SpanScopeSelector';
import { StyledCheckOutlined, TypographyText } from './style';
import {
	convertExampleQueriesToOptions,
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
	className,
	placeholder,
	suffixIcon,
	isInfraMonitoring,
	disableNavigationShortcuts,
	entity,
}: QueryBuilderSearchProps): JSX.Element {
	const { pathname } = useLocation();
	const isLogsExplorerPage = useMemo(() => pathname === ROUTES.LOGS_EXPLORER, [
		pathname,
	]);

	const isTracesExplorerPage = useMemo(
		() => pathname === ROUTES.TRACES_EXPLORER,
		[pathname],
	);

	const [isEditingTag, setIsEditingTag] = useState(false);

	const {
		updateTag,
		handleClearTag,
		handleKeyDown,
		handleOnBlur,
		handleSearch,
		handleSelect,
		tags,
		options,
		searchValue,
		isMulti,
		isFetching,
		setSearchKey,
		setSearchValue,
		searchKey,
		key,
		exampleQueries,
	} = useAutoComplete(
		query,
		whereClauseConfig,
		isLogsExplorerPage,
		isInfraMonitoring,
		entity,
	);

	const [isOpen, setIsOpen] = useState<boolean>(false);
	const [showAllFilters, setShowAllFilters] = useState<boolean>(false);
	const [dynamicPlacholder, setDynamicPlaceholder] = useState<string>(
		placeholder || '',
	);
	const selectRef = useRef<BaseSelectRef>(null);

	const { sourceKeys, handleRemoveSourceKey } = useFetchKeysAndValues(
		searchValue,
		query,
		searchKey,
		isLogsExplorerPage,
		isInfraMonitoring,
		entity,
	);

	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	const { handleRunQuery, currentQuery } = useQueryBuilder();

	const toggleEditMode = useCallback(
		(value: boolean) => {
			// Editing mode is required only in infra monitoring mode
			if (isInfraMonitoring) {
				setIsEditingTag(value);
			}
		},
		[isInfraMonitoring],
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
			// Editing is done after closing a tag
			toggleEditMode(false);
			handleSearch('');
			setSearchKey('');
		};

		const tagEditHandler = (value: string): void => {
			updateTag(value);
			// Editing starts
			toggleEditMode(true);
			if (isInfraMonitoring) {
				setSearchValue(value);
			} else {
				handleSearch(value);
			}
		};

		const isDisabled = !!searchValue;

		return (
			<Tag closable={!searchValue && closable} onClose={onCloseHandler}>
				<Tooltip title={chipValue}>
					<TypographyText
						ellipsis
						$isInNin={isInNin}
						disabled={isDisabled}
						$isEnabled={!!searchValue}
						onClick={(): void => {
							if (!isDisabled) tagEditHandler(value);
						}}
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

		// Editing is done after enter key press
		if (event.key === 'Enter') {
			toggleEditMode(false);
		}

		if (
			!disableNavigationShortcuts &&
			(event.ctrlKey || event.metaKey) &&
			event.key === 'Enter'
		) {
			event.preventDefault();
			event.stopPropagation();
			handleRunQuery();
			setIsOpen(false);
		}

		if (
			!disableNavigationShortcuts &&
			(event.ctrlKey || event.metaKey) &&
			event.key === '/'
		) {
			event.preventDefault();
			event.stopPropagation();
			setShowAllFilters((prev) => !prev);
		}
	};

	const handleDeselect = useCallback(
		(deselectedItem: string) => {
			handleClearTag(deselectedItem);
			handleRemoveSourceKey(deselectedItem);
		},
		[handleClearTag, handleRemoveSourceKey],
	);

	const isMetricsDataSource = useMemo(
		() => query.dataSource === DataSource.METRICS && !isInfraMonitoring,
		[query.dataSource, isInfraMonitoring],
	);

	const fetchValueDataType = (value: unknown, operator: string): DataTypes => {
		if (operator === OPERATORS.HAS || operator === OPERATORS.NHAS) {
			return getDataTypes([value]);
		}

		return DataTypes.EMPTY;
	};

	const queryTags = useMemo(() => {
		if (!query.aggregateAttribute.key && isMetricsDataSource) return [];
		return tags;
	}, [isMetricsDataSource, query.aggregateAttribute.key, tags]);

	useEffect(() => {
		const initialTagFilters: TagFilter = { items: [], op: 'AND' };
		const initialSourceKeys = query.filters.items?.map(
			(item) => item.key as BaseAutocompleteData,
		);

		initialTagFilters.items = tags.map((tag, index) => {
			const isJsonTrue = query.filters?.items[index]?.key?.isJSON;

			const { tagKey, tagOperator, tagValue } = getTagToken(tag);

			const filterAttribute = [...initialSourceKeys, ...sourceKeys].find(
				(key) => key?.key === getRemovePrefixFromKey(tagKey),
			);

			const computedTagValue =
				tagValue && Array.isArray(tagValue) && tagValue[tagValue.length - 1] === ''
					? tagValue?.slice(0, -1)
					: tagValue ?? '';

			return {
				id: uuid().slice(0, 8),
				key: filterAttribute ?? {
					key: tagKey,
					dataType: fetchValueDataType(computedTagValue, tagOperator),
					type: '',
					isColumn: false,
					isJSON: isJsonTrue,
				},
				op: getOperatorValue(tagOperator),
				value: computedTagValue,
			};
		});

		// If in infra monitoring, only run the onChange query when editing is finsished.
		if (isInfraMonitoring) {
			if (!isEditingTag) {
				onChange(initialTagFilters);
			}
		} else {
			onChange(initialTagFilters);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [sourceKeys]);

	const isLastQuery = useMemo(
		() =>
			isEqual(
				currentQuery.builder.queryData[currentQuery.builder.queryData.length - 1],
				query,
			),
		[currentQuery, query],
	);

	useEffect(() => {
		if (isLastQuery && !disableNavigationShortcuts) {
			registerShortcut(LogsExplorerShortcuts.FocusTheSearchBar, () => {
				// set timeout is needed here else the select treats the hotkey as input value
				setTimeout(() => {
					selectRef.current?.focus();
				}, 0);
			});
		}

		return (): void =>
			deregisterShortcut(LogsExplorerShortcuts.FocusTheSearchBar);
	}, [
		deregisterShortcut,
		disableNavigationShortcuts,
		isLastQuery,
		registerShortcut,
	]);

	useEffect(() => {
		if (!isOpen) {
			setDynamicPlaceholder(placeholder || '');
		}
	}, [isOpen, placeholder]);

	const userOs = getUserOperatingSystem();

	// conditional changes here to use a seperate component to render the example queries based on the option group label
	const customRendererForLogsExplorer = options.map((option) => (
		<Select.Option key={option.label} value={option.value}>
			<OptionRendererForLogs
				label={option.label}
				value={option.value}
				dataType={option.dataType || ''}
				isIndexed={option.isIndexed || false}
				setDynamicPlaceholder={setDynamicPlaceholder}
			/>
			{option.selected && <StyledCheckOutlined />}
		</Select.Option>
	));

	return (
		<div className="query-builder-search-container">
			<Select
				ref={selectRef}
				getPopupContainer={popupContainer}
				transitionName=""
				choiceTransitionName=""
				virtual={false}
				showSearch
				tagRender={onTagRender}
				filterOption={false}
				open={isOpen}
				onDropdownVisibleChange={setIsOpen}
				autoClearSearchValue={false}
				mode="multiple"
				placeholder={dynamicPlacholder}
				value={queryTags}
				searchValue={searchValue}
				className={cx(
					className,
					isLogsExplorerPage ? 'logs-popup' : '',
					!showAllFilters && options.length > 3 && !key ? 'hide-scroll' : '',
				)}
				rootClassName="query-builder-search"
				disabled={isMetricsDataSource && !query.aggregateAttribute.key}
				style={selectStyle}
				onSearch={handleSearch}
				onChange={onChangeHandler}
				onSelect={handleSelect}
				onDeselect={handleDeselect}
				onInputKeyDown={onInputKeyDownHandler}
				notFoundContent={isFetching ? <Spin size="small" /> : null}
				suffixIcon={
					// eslint-disable-next-line no-nested-ternary
					!isUndefined(suffixIcon) ? (
						suffixIcon
					) : isOpen ? (
						<ChevronUp size={14} />
					) : (
						<ChevronDown size={14} />
					)
				}
				showAction={['focus']}
				onBlur={(e: React.FocusEvent<HTMLInputElement>): void => {
					handleOnBlur(e);
					// Editing is done after tapping out of the input
					toggleEditMode(false);
				}}
				popupClassName={isLogsExplorerPage ? 'logs-explorer-popup' : ''}
				dropdownRender={(menu): ReactElement => (
					<div>
						{!searchKey && isLogsExplorerPage && (
							<div className="ant-select-item-group ">Suggested Filters</div>
						)}
						{menu}
						{isLogsExplorerPage && (
							<div>
								{!searchKey && tags.length === 0 && (
									<div className="example-queries">
										<div className="heading"> Example Queries </div>
										<div className="query-container">
											{convertExampleQueriesToOptions(exampleQueries).map((query) => (
												<ExampleQueriesRendererForLogs
													key={query.label}
													label={query.label}
													value={query.value}
													handleAddTag={onChange}
												/>
											))}
										</div>
									</div>
								)}
								{!key && !isFetching && !showAllFilters && options.length > 3 && (
									<Button
										type="text"
										className="show-all-filter-props"
										onClick={(): void => {
											setShowAllFilters(true);
											// when clicking on the button the search bar looses the focus
											selectRef?.current?.focus();
										}}
									>
										<div className="content">
											<section className="left-section">
												<Filter size={14} />
												<Typography.Text className="text">
													Show all filters properties
												</Typography.Text>
											</section>
											<section className="right-section">
												{userOs === UserOperatingSystem.MACOS ? (
													<Command size={14} className="keyboard-shortcut-slash" />
												) : (
													<ChevronUp size={14} className="keyboard-shortcut-slash" />
												)}
												+
												<Slash size={14} className="keyboard-shortcut-slash" />
											</section>
										</div>
									</Button>
								)}
								<div className="keyboard-shortcuts">
									<section className="navigate">
										<ArrowDown size={10} className="icons" />
										<ArrowUp size={10} className="icons" />
										<span className="keyboard-text">to navigate</span>
									</section>
									<section className="update-query">
										<CornerDownLeft size={10} className="icons" />
										<span className="keyboard-text">to update query</span>
									</section>
								</div>
							</div>
						)}
					</div>
				)}
			>
				{isLogsExplorerPage
					? customRendererForLogsExplorer
					: options.map((option) => (
							<Select.Option key={option.label} value={option.value}>
								<OptionRenderer
									label={option.label}
									value={option.value}
									dataType={option.dataType || ''}
									type={option.type || ''}
								/>
								{option.selected && <StyledCheckOutlined />}
							</Select.Option>
					  ))}
			</Select>
			{isTracesExplorerPage && <SpanScopeSelector queryName={query.queryName} />}
		</div>
	);
}

interface QueryBuilderSearchProps {
	query: IBuilderQuery;
	onChange: (value: TagFilter) => void;
	whereClauseConfig?: WhereClauseConfig;
	className?: string;
	placeholder?: string;
	suffixIcon?: React.ReactNode;
	isInfraMonitoring?: boolean;
	disableNavigationShortcuts?: boolean;
	entity?: K8sCategory | null;
}

QueryBuilderSearch.defaultProps = {
	whereClauseConfig: undefined,
	className: '',
	placeholder: PLACEHOLDER,
	suffixIcon: undefined,
	isInfraMonitoring: false,
	disableNavigationShortcuts: false,
	entity: null,
};

export interface CustomTagProps {
	label: ReactNode;
	value: string;
	disabled: boolean;
	onClose: () => void;
	closable: boolean;
}

export default QueryBuilderSearch;
