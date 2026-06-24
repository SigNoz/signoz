/* eslint-disable sonarjs/no-identical-functions */
import { Fragment, useMemo, useState } from 'react';
import { Input } from '@signozhq/ui/input';
import { Skeleton } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import {
	IQuickFiltersConfig,
	QuickFiltersSource,
} from 'components/QuickFilters/types';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import CheckboxFilterHeader from './CheckboxFilterHeader';
import CheckboxValueRow from './CheckboxValueRow';
import LogsQuickFilterEmptyState from './LogsQuickFilterEmptyState';
import useActiveQueryIndex from './useActiveQueryIndex';
import useCheckboxDisclosure from './useCheckboxDisclosure';
import useCheckboxFilterActions from './useCheckboxFilterActions';
import useCheckboxFilterState from './useCheckboxFilterState';
import useCheckboxFilterValues from './useCheckboxFilterValues';

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

	const activeQueryIndex = useActiveQueryIndex(source);

	const {
		isOpen,
		isSomeFilterPresentForCurrentAttribute,
		visibleItemsCount,
		onToggleOpen,
		onShowMore,
	} = useCheckboxDisclosure({ filter, activeQueryIndex });

	const { attributeValues, isLoading } = useCheckboxFilterValues({
		filter,
		source,
		searchText,
		isOpen,
	});

	const { currentFilterState, isFilterDisabled, isMultipleValuesTrueForTheKey } =
		useCheckboxFilterState({ filter, attributeValues, activeQueryIndex });

	const { onChange, onClear } = useCheckboxFilterActions({
		filter,
		source,
		attributeValues,
		activeQueryIndex,
		onFilterChange,
	});

	const setSearchTextDebounced = useDebouncedFn((...args) => {
		setSearchText(args[0] as string);
	}, DEBOUNCE_DELAY);

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

	const isEmptyStateWithDocsEnabled =
		SOURCES_WITH_EMPTY_STATE_ENABLED.includes(source) &&
		!searchText &&
		!attributeValues.length;

	return (
		<div className="checkbox-filter">
			<CheckboxFilterHeader
				title={filter.title}
				isOpen={isOpen}
				showClearAll={!!attributeValues.length}
				onToggleOpen={onToggleOpen}
				onClear={onClear}
			/>
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
									<CheckboxValueRow
										value={value}
										checked={currentFilterState[value]}
										disabled={isFilterDisabled}
										title={filter.title}
										onlyButtonLabel={
											isSomeFilterPresentForCurrentAttribute
												? currentFilterState[value] && !isMultipleValuesTrueForTheKey
													? 'All'
													: 'Only'
												: 'Only'
										}
										customRendererForValue={filter.customRendererForValue}
										onCheckboxChange={(checked): void => onChange(value, checked, false)}
										onOnlyOrAllClick={(): void =>
											onChange(value, currentFilterState[value], true)
										}
									/>
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
							<Typography.Text className="show-more-text" onClick={onShowMore}>
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
