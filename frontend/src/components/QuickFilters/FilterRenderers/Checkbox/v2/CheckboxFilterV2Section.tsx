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
		isFilterDisabled,
		filter,
		isSomeFilterPresentForCurrentAttribute,
		isMultipleValuesTrueForTheKey,
		onChange,
	} = props;

	if (section.items.length === 0) {
		return null;
	}

	const config = getSectionConfig(section.type);

	// Show divider for all sections except first SELECTED section
	const showDivider =
		config !== null && (index > 0 || section.type !== SectionType.SELECTED);

	return (
		<div data-testid={`section-${section.type}`} className={styles.sectionValues}>
			{showDivider && config && (
				<SectionDivider label={config.label} tooltip={config.tooltip} />
			)}
			{section.items.map(({ value, badge, checkedState }) => {
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
			})}
		</div>
	);
}
