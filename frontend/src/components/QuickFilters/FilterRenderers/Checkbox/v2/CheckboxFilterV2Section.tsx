import { Typography } from '@signozhq/ui/typography';
import { LoaderCircle } from '@signozhq/icons';

import {
	IQuickFiltersConfig,
	CheckedState,
} from 'components/QuickFilters/types';

import { CheckboxFilterV2ValueRow } from './CheckboxFilterV2ValueRow';
import { SectionDivider } from './SectionDivider';
import { Section } from './useSectionedValues';
import { SectionType } from './itemRules';

import styles from './CheckboxFilterV2.module.scss';

interface SectionConfig {
	label: string;
	tooltip?: string;
}

function getSectionConfig(type: SectionType): SectionConfig | null {
	switch (type) {
		case SectionType.SELECTED:
			return { label: 'Selected' };
		case SectionType.SEARCH_RESULTS:
			return { label: 'Search Results' };
		case SectionType.RELATED:
			return {
				label: 'Related',
				tooltip: 'Values that are filtered by your current selection.',
			};
		case SectionType.ALL_VALUES:
			return { label: 'All values' };
		default:
			return null;
	}
}

interface CheckboxFilterV2SectionProps {
	section: Section;
	index: number;
	searchText: string;
	isLoading: boolean;
	isFetching: boolean;
	isFilterDisabled: boolean;
	filter: IQuickFiltersConfig;
	isSomeFilterPresentForCurrentAttribute: boolean;
	isMultipleValuesTrueForTheKey: boolean;
	onChange: (
		value: string,
		checked: boolean,
		isOnly: boolean,
		previousState?: CheckedState,
		sectionType?: SectionType,
	) => void;
}

export function CheckboxFilterV2Section(
	props: CheckboxFilterV2SectionProps,
): JSX.Element | null {
	const {
		section,
		index,
		searchText,
		isLoading,
		isFetching,
		isFilterDisabled,
		filter,
		isSomeFilterPresentForCurrentAttribute,
		isMultipleValuesTrueForTheKey,
		onChange,
	} = props;

	const isSearching = !!searchText;
	const isEmpty = section.items.length === 0;

	// Non-search mode: hide empty sections, no loading states
	if (!isSearching && isEmpty) {
		return null;
	}

	const config = getSectionConfig(section.type);

	// Show divider if:
	// - Not the first section (when not searching and section is selected)
	// - Or when searching (both selected and search results get dividers)
	const showDivider =
		config !== null &&
		(isSearching || index > 0 || section.type !== SectionType.SELECTED);

	const isSearchResultsSection = section.type === SectionType.SEARCH_RESULTS;

	const renderItems = (): JSX.Element[] =>
		section.items.map(({ value, badge, checkedState }) => {
			const isChecked = checkedState === 'checked';

			return (
				<CheckboxFilterV2ValueRow
					key={value}
					value={value}
					checkedState={checkedState}
					disabled={isFilterDisabled}
					title={filter.title}
					badge={badge}
					onlyButtonLabel={
						isSomeFilterPresentForCurrentAttribute
							? isChecked && !isMultipleValuesTrueForTheKey
								? 'All'
								: 'Only'
							: 'Only'
					}
					customRendererForValue={filter.customRendererForValue}
					onCheckboxChange={(checked, previousState): void =>
						onChange(value, checked, false, previousState, section.type)
					}
					onOnlyOrAllClick={(): void => onChange(value, isChecked, true)}
				/>
			);
		});

	const renderSearchResultsContent = (): JSX.Element | JSX.Element[] => {
		if (isLoading || isFetching) {
			return (
				<div
					className={styles.noData}
					data-testid="checkbox-filter-search-results-loading"
				>
					<LoaderCircle size={16} className={styles.searchSpinner} />
				</div>
			);
		}

		if (isEmpty) {
			return (
				<div
					className={styles.noData}
					data-testid="checkbox-filter-no-search-results"
				>
					<Typography.Text>No values found</Typography.Text>
				</div>
			);
		}

		return renderItems();
	};

	return (
		<div data-testid={`section-${section.type}`} className={styles.sectionValues}>
			{showDivider && config && (
				<SectionDivider label={config.label} tooltip={config.tooltip} />
			)}
			{isSearchResultsSection ? renderSearchResultsContent() : renderItems()}
		</div>
	);
}
