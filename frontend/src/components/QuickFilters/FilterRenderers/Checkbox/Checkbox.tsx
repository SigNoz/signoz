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
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

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
			<section className="filter-header-checkbox" onClick={onToggleOpen}>
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
								onClear();
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
