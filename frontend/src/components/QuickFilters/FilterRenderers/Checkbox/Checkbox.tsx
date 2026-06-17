/* eslint-disable sonarjs/no-identical-functions */
import { Fragment, useMemo, useState } from 'react';
import { Input } from '@signozhq/ui/input';
import { Button, Skeleton } from 'antd';
import { Checkbox } from '@signozhq/ui/checkbox';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import {
	IQuickFiltersConfig,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { isFunction } from 'lodash-es';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	applyCheckboxToggle,
	clearFilterFromQuery,
	deriveCheckboxState,
} from './checkboxFilterQuery';
import LogsQuickFilterEmptyState from './LogsQuickFilterEmptyState';
import useCheckboxFilterValues from './useCheckboxFilterValues';
import { isKeyMatch } from './utils';

import './Checkbox.styles.scss';

const SOURCES_WITH_EMPTY_STATE_ENABLED = [QuickFiltersSource.LOGS_EXPLORER];

interface ICheckboxProps {
	filter: IQuickFiltersConfig;
	source: QuickFiltersSource;
	onFilterChange?: (query: Query) => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function CheckboxFilter(props: ICheckboxProps): JSX.Element {
	const { source, filter, onFilterChange } = props;
	const [searchText, setSearchText] = useState<string>('');
	// null = no user action, true = user opened, false = user closed
	const [userToggleState, setUserToggleState] = useState<boolean | null>(null);
	const [visibleItemsCount, setVisibleItemsCount] = useState<number>(10);

	const {
		lastUsedQuery,
		currentQuery,
		redirectWithQueryBuilderData,
		panelType,
	} = useQueryBuilder();

	// Determine if we're in ListView mode
	const isListView = panelType === PANEL_TYPES.LIST;
	// In ListView mode, use index 0 for most sources; for TRACES_EXPLORER, use lastUsedQuery
	// Otherwise use lastUsedQuery for non-ListView modes
	const activeQueryIndex = useMemo(() => {
		if (isListView) {
			return source === QuickFiltersSource.TRACES_EXPLORER
				? lastUsedQuery || 0
				: 0;
		}
		return lastUsedQuery || 0;
	}, [isListView, source, lastUsedQuery]);

	// Check if this filter has active filters in the query
	const isSomeFilterPresentForCurrentAttribute = useMemo(
		() =>
			currentQuery.builder.queryData?.[activeQueryIndex]?.filters?.items?.some(
				(item) => isKeyMatch(item.key?.key, filter.attributeKey.key),
			),
		[currentQuery.builder.queryData, activeQueryIndex, filter.attributeKey.key],
	);

	// Derive isOpen from filter state + user action
	const isOpen = useMemo(() => {
		// If user explicitly toggled, respect that
		if (userToggleState !== null) {
			return userToggleState;
		}

		// Auto-open if this filter has active filters in the query
		if (isSomeFilterPresentForCurrentAttribute) {
			return true;
		}

		// Otherwise use default behavior (first 2 filters open)
		return filter.defaultOpen;
	}, [
		userToggleState,
		isSomeFilterPresentForCurrentAttribute,
		filter.defaultOpen,
	]);

	const { attributeValues, isLoading } = useCheckboxFilterValues({
		filter,
		source,
		searchText,
		isOpen,
	});

	const setSearchTextDebounced = useDebouncedFn((...args) => {
		setSearchText(args[0] as string);
	}, DEBOUNCE_DELAY);

	// derive the state of each filter key here in the renderer itself and keep it in sync with current query
	const currentFilterState = useMemo(
		() =>
			deriveCheckboxState({
				attributeValues,
				filterItems:
					currentQuery?.builder.queryData?.[activeQueryIndex]?.filters?.items,
				filterKey: filter.attributeKey.key,
			}),
		[
			attributeValues,
			currentQuery?.builder.queryData,
			filter.attributeKey,
			activeQueryIndex,
		],
	);

	// disable the filter when there are multiple entries of the same attribute key present in the filter bar
	const isFilterDisabled = useMemo(
		() =>
			(currentQuery?.builder?.queryData?.[
				activeQueryIndex
			]?.filters?.items?.filter((item) =>
				isKeyMatch(item.key?.key, filter.attributeKey.key),
			)?.length || 0) > 1,

		[currentQuery?.builder?.queryData, activeQueryIndex, filter.attributeKey],
	);

	// variable to check if the current filter has multiple values to its name in the key op value section
	const isMultipleValuesTrueForTheKey =
		Object.values(currentFilterState).filter((val) => val).length > 1;

	// Sort checked items to the top, then unchecked items
	const currentAttributeKeys = useMemo(() => {
		const checkedValues = attributeValues.filter(
			(val) => currentFilterState[val],
		);
		const uncheckedValues = attributeValues.filter(
			(val) => !currentFilterState[val],
		);
		return [...checkedValues, ...uncheckedValues].slice(0, visibleItemsCount);
	}, [attributeValues, currentFilterState, visibleItemsCount]);

	// Count of checked values in the currently visible items
	const checkedValuesCount = useMemo(
		() => currentAttributeKeys.filter((val) => currentFilterState[val]).length,
		[currentAttributeKeys, currentFilterState],
	);

	const handleClearFilterAttribute = (): void => {
		const preparedQuery = clearFilterFromQuery({
			currentQuery,
			filter,
			activeQueryIndex,
		});

		if (onFilterChange && isFunction(onFilterChange)) {
			onFilterChange(preparedQuery);
		} else {
			redirectWithQueryBuilderData(preparedQuery);
		}
	};

	const onChange = (
		value: string,
		checked: boolean,
		isOnlyOrAllClicked: boolean,
	): void => {
		const finalQuery = applyCheckboxToggle({
			currentQuery,
			activeQueryIndex,
			filter,
			source,
			attributeValues,
			value,
			checked,
			isOnlyOrAllClicked,
		});

		if (onFilterChange && isFunction(onFilterChange)) {
			onFilterChange(finalQuery);
		} else {
			redirectWithQueryBuilderData(finalQuery);
		}
	};

	const isEmptyStateWithDocsEnabled =
		SOURCES_WITH_EMPTY_STATE_ENABLED.includes(source) &&
		!searchText &&
		!attributeValues.length;

	return (
		<div className="checkbox-filter">
			<section
				className="filter-header-checkbox"
				onClick={(): void => {
					if (isOpen) {
						setUserToggleState(false);
						setVisibleItemsCount(10);
					} else {
						setUserToggleState(true);
					}
				}}
			>
				<section className="left-action">
					{isOpen ? (
						<ChevronDown size={13} cursor="pointer" />
					) : (
						<ChevronRight size={13} cursor="pointer" />
					)}
					<Typography.Text className="title">{filter.title}</Typography.Text>
				</section>
				<section className="right-action">
					{isOpen && !!attributeValues.length && (
						<Typography.Text
							className="clear-all"
							onClick={(e): void => {
								e.stopPropagation();
								e.preventDefault();
								handleClearFilterAttribute();
							}}
						>
							Clear All
						</Typography.Text>
					)}
				</section>
			</section>
			{isOpen && isLoading && !attributeValues.length && (
				<section className="loading">
					<Skeleton paragraph={{ rows: 4 }} />
				</section>
			)}
			{isOpen && !isLoading && (
				<>
					{!isEmptyStateWithDocsEnabled && (
						<section className="search">
							<Input
								placeholder="Filter values"
								onChange={(e): void => setSearchTextDebounced(e.target.value)}
								disabled={isFilterDisabled}
							/>
						</section>
					)}
					{attributeValues.length > 0 ? (
						<section className="values">
							{currentAttributeKeys.map((value: string, index: number) => (
								<Fragment key={value}>
									{index === checkedValuesCount && checkedValuesCount > 0 && (
										<div
											key="separator"
											className="filter-separator"
											data-testid="filter-separator"
										/>
									)}
									<div className="value">
										<Checkbox
											onChange={(checked): void =>
												onChange(value, checked === true, false)
											}
											value={currentFilterState[value]}
											disabled={isFilterDisabled}
											className="check-box"
										/>

										<div
											className={cx(
												'checkbox-value-section',
												isFilterDisabled ? 'filter-disabled' : '',
											)}
											onClick={(): void => {
												if (isFilterDisabled) {
													return;
												}
												onChange(value, currentFilterState[value], true);
											}}
										>
											<div className={`${filter.title} label-${value}`} />
											{filter.customRendererForValue ? (
												filter.customRendererForValue(value)
											) : (
												<Typography.Text className="value-string" truncate={1}>
													{String(value)}
												</Typography.Text>
											)}
											<Button type="text" className="only-btn">
												{isSomeFilterPresentForCurrentAttribute
													? currentFilterState[value] && !isMultipleValuesTrueForTheKey
														? 'All'
														: 'Only'
													: 'Only'}
											</Button>
											<Button type="text" className="toggle-btn">
												Toggle
											</Button>
										</div>
									</div>
								</Fragment>
							))}
						</section>
					) : isEmptyStateWithDocsEnabled ? (
						<LogsQuickFilterEmptyState attributeKey={filter.attributeKey.key} />
					) : (
						<section className="no-data">
							<Typography.Text>No values found</Typography.Text>{' '}
						</section>
					)}
					{visibleItemsCount < attributeValues?.length && (
						<section className="show-more">
							<Typography.Text
								className="show-more-text"
								onClick={(): void => setVisibleItemsCount((prev) => prev + 10)}
							>
								Show More...
							</Typography.Text>
						</section>
					)}
				</>
			)}
		</div>
	);
}

CheckboxFilter.defaultProps = {
	onFilterChange: null,
};
