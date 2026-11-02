import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@signozhq/ui/input';
import { Skeleton } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { LoaderCircle } from '@signozhq/icons';
import {
	IQuickFiltersConfig,
	QuickFilterChangeEventData,
	QuickFilterCheckboxUseFieldApis,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { NON_SELECTED_OPERATORS } from '../checkboxFilterQuery';
import useActiveQueryIndex from 'components/QuickFilters/hooks/useActiveQueryIndex';
import { DEFAULT_VISIBLE_ITEMS_COUNT } from '../constants';
import useCheckboxDisclosure from '../useCheckboxDisclosure';
import useCheckboxFilterActions from '../useCheckboxFilterActions';
import useCheckboxFilterState from '../useCheckboxFilterState';
import { useFieldValues } from './useFieldValues';
import { useExistingQuery } from './useExistingQuery';
import { isKeyMatch } from '../utils';

import { CheckboxFilterV2Header } from './CheckboxFilterV2Header';
import { CheckboxFilterV2Section } from './CheckboxFilterV2Section';
import { buildSelectedSet, useSectionedValues } from './useSectionedValues';
import { useStaleRelatedExclusions } from './useStaleRelatedExclusions';

import styles from './CheckboxFilterV2.module.scss';

interface CheckboxFilterV2Props {
	filter: IQuickFiltersConfig;
	quickFilterSource: QuickFiltersSource;
	onFilterChange?: (query: Query) => void;
	onQuickFilterChange?: (data: QuickFilterChangeEventData) => void;
	useFieldApis: QuickFilterCheckboxUseFieldApis;
}

export default function CheckboxFilterV2(
	props: CheckboxFilterV2Props,
): JSX.Element {
	const {
		quickFilterSource,
		filter,
		onFilterChange,
		onQuickFilterChange,
		useFieldApis,
	} = props;
	const [searchText, setSearchText] = useState<string>('');
	const [userToggleState, setUserToggleState] = useState<boolean | null>(null);

	const { currentQuery } = useQueryBuilder();
	const activeQueryIndex = useActiveQueryIndex(quickFilterSource);

	const {
		isOpen,
		isSomeFilterPresentForCurrentAttribute,
		visibleItemsCount,
		onToggleOpen,
		onShowMore,
	} = useCheckboxDisclosure({ filter, activeQueryIndex });

	// Auto-preserve open state when filter is present
	useEffect(() => {
		if (isSomeFilterPresentForCurrentAttribute && userToggleState === null) {
			setUserToggleState(true);
		}
	}, [isSomeFilterPresentForCurrentAttribute, userToggleState]);

	const { existingQuery, hasExistingQuery } = useExistingQuery({
		useFieldApis,
		activeQueryIndex,
	});

	const { relatedValues, allValues, isLoading, isFetching } = useFieldValues({
		filter,
		searchText,
		existingQuery,
		metricNamespace: useFieldApis.metricNamespace,
		quickFilterSource,
		startUnixMilli: useFieldApis.startUnixMilli,
		endUnixMilli: useFieldApis.endUnixMilli,
		enabled: isOpen,
	});

	// Track if initial load completed (don't show skeleton after first load)
	// Must track if loading ever started, otherwise hasLoadedOnce gets set
	// immediately on first render when query is disabled (isLoading=false)
	const hasLoadedOnce = useRef(false);
	const wasLoading = useRef(false);
	if (isLoading) {
		wasLoading.current = true;
	}
	if (!isLoading && wasLoading.current && !hasLoadedOnce.current) {
		hasLoadedOnce.current = true;
	}

	// Combine for state derivation
	const attributeValues = useMemo(() => {
		const combined = [...relatedValues, ...allValues];
		return [...new Set(combined)];
	}, [relatedValues, allValues]);

	const { currentFilterState, isFilterDisabled, isMultipleValuesTrueForTheKey } =
		useCheckboxFilterState({ filter, attributeValues, activeQueryIndex });

	const { onChange, onClear } = useCheckboxFilterActions({
		filter,
		quickFilterSource,
		attributeValues,
		activeQueryIndex,
		onFilterChange,
		onQuickFilterChange,
	});

	const setSearchTextDebounced = useDebouncedFn((...args) => {
		setSearchText(args[0] as string);
	}, DEBOUNCE_DELAY);

	const handleToggleOpen = (): void => {
		if (isOpen) {
			setSearchTextDebounced.cancel();
			setSearchText('');
		}
		onToggleOpen();
	};

	const currentFilterOp = useMemo(() => {
		const filterSync = currentQuery?.builder.queryData?.[
			activeQueryIndex
		]?.filters?.items.find((item) =>
			isKeyMatch(item.key?.key, filter.attributeKey.key),
		);
		return filterSync?.op;
	}, [
		currentQuery?.builder.queryData,
		activeQueryIndex,
		filter.attributeKey.key,
	]);

	const isNotInOperator = NON_SELECTED_OPERATORS.includes(currentFilterOp || '');

	const selectedValues = useMemo(
		() => [
			...buildSelectedSet(
				currentFilterState,
				isSomeFilterPresentForCurrentAttribute,
				isNotInOperator,
			),
		],
		[currentFilterState, isSomeFilterPresentForCurrentAttribute, isNotInOperator],
	);

	const isRefreshing = isFetching && !isLoading && searchText === '';
	const relatedExclusions = useStaleRelatedExclusions({
		selectedValues,
		isFetching,
		isRefreshing,
	});

	const { sections, totalCount } = useSectionedValues({
		relatedValues,
		allValues,
		currentFilterState,
		isSomeFilterPresentForCurrentAttribute,
		isNotInOperator,
		hasExistingQuery,
		isRelatedValuesSupported: useFieldApis.existingQuery !== null,
		visibleItemsCount,
		relatedExclusions,
	});

	// Kept while a search is typed, so narrowing the list does not remove the box,
	// and while a refetch still shows the previous, narrowed results.
	const wasSearchShown = useRef(false);
	const isSearchShown =
		searchText !== '' ||
		totalCount > DEFAULT_VISIBLE_ITEMS_COUNT ||
		(isFetching && wasSearchShown.current);
	wasSearchShown.current = isSearchShown;

	return (
		<div className={styles.checkboxFilter} data-testid="checkbox-filter-v2">
			<CheckboxFilterV2Header
				title={filter.title}
				isOpen={isOpen}
				canReset={isSomeFilterPresentForCurrentAttribute}
				onToggleOpen={handleToggleOpen}
				onClear={onClear}
			/>
			{isOpen && isLoading && !hasLoadedOnce.current && (
				<section>
					<Skeleton paragraph={{ rows: 4 }} />
				</section>
			)}
			{isOpen && (!isLoading || hasLoadedOnce.current) && (
				<>
					{isSearchShown && (
						<section className={styles.search}>
							<Input
								placeholder="Filter values"
								onChange={(e): void => setSearchTextDebounced(e.target.value)}
								disabled={isFilterDisabled}
								data-testid="checkbox-filter-search"
								suffix={
									isFetching ? (
										<LoaderCircle
											size={14}
											className={styles.searchSpinner}
											data-testid="checkbox-filter-search-loading"
										/>
									) : null
								}
							/>
						</section>
					)}

					{totalCount > 0 && (
						<section className={styles.values}>
							{sections.map((section, index) => (
								<CheckboxFilterV2Section
									key={section.type}
									section={section}
									index={index}
									isFilterDisabled={isFilterDisabled}
									filter={filter}
									isSomeFilterPresentForCurrentAttribute={
										isSomeFilterPresentForCurrentAttribute
									}
									isMultipleValuesTrueForTheKey={isMultipleValuesTrueForTheKey}
									onChange={onChange}
								/>
							))}
						</section>
					)}

					{totalCount === 0 && hasLoadedOnce.current && !isFetching && (
						<section
							className={styles.noData}
							data-testid={
								searchText
									? 'checkbox-filter-no-search-results'
									: 'checkbox-filter-empty'
							}
						>
							<Typography.Text>No values found</Typography.Text>
						</section>
					)}

					{visibleItemsCount < totalCount &&
						!(searchText && (isLoading || isFetching)) && (
							<section className={styles.showMore}>
								<Typography.Text
									className={styles.showMoreText}
									onClick={onShowMore}
									data-testid="checkbox-filter-show-more"
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
