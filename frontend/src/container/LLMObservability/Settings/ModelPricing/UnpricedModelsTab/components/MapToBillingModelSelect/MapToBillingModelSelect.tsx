import { useState } from 'react';
import {
	Combobox,
	ComboboxCommand,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxLoading,
	ComboboxTrigger,
} from '@signozhq/ui/combobox';

import styles from './MapToBillingModelSelect.module.scss';
import type { PricingRule } from '../../../types';
import { useMapToBillingModelSearch } from './useMapToBillingModelSearch';
import { getRuleOptionLabel } from '../../../utils';

interface MapToBillingModelSelectProps {
	modelName: string;
	// The rule currently chosen for this row, used to render the trigger label.
	selectedRule: PricingRule | undefined;
	disabled: boolean;
	onSelect: (rule: PricingRule) => void;
}

// Searchable, server-paged dropdown for picking the billing model an unpriced
// model maps onto. Only RULE_OPTIONS_LIMIT rules are fetched at a time; typing
// narrows the set via the rules API rather than client-side filtering, so cmdk's
// own filter is disabled (shouldFilter={false}).
function MapToBillingModelSelect({
	modelName,
	selectedRule,
	disabled,
	onSelect,
}: MapToBillingModelSelectProps): JSX.Element {
	const [open, setOpen] = useState(false);
	const { searchText, setSearchText, rules, rulesById, isFetching } =
		useMapToBillingModelSearch(open);

	const handleSelect = (ruleId: string): void => {
		const rule = rulesById.get(ruleId);
		if (rule) {
			onSelect(rule);
		}
		setOpen(false);
	};

	return (
		<Combobox open={open} onOpenChange={setOpen}>
			<ComboboxTrigger
				className={styles.mapToSelect}
				disabled={disabled}
				placeholder="Select a billing model"
				value={selectedRule ? getRuleOptionLabel(selectedRule) : undefined}
				testId={`map-to-select-${modelName}`}
			/>
			<ComboboxContent className={styles.mapToDropdown}>
				<ComboboxCommand shouldFilter={false}>
					<ComboboxInput
						value={searchText}
						onValueChange={setSearchText}
						placeholder="Search billing models"
						testId={`map-to-search-${modelName}`}
					/>
					<ComboboxList>
						{rules.map((rule) => (
							<ComboboxItem
								key={rule.id}
								value={rule.id}
								isSelected={selectedRule?.id === rule.id}
								onSelect={(): void => handleSelect(rule.id)}
								data-testid={`map-to-option-${rule.id}`}
							>
								{getRuleOptionLabel(rule)}
							</ComboboxItem>
						))}
						{isFetching && <ComboboxLoading>Loading…</ComboboxLoading>}
						{!isFetching && rules.length === 0 && (
							<ComboboxEmpty>No billing models found</ComboboxEmpty>
						)}
					</ComboboxList>
				</ComboboxCommand>
			</ComboboxContent>
		</Combobox>
	);
}

export default MapToBillingModelSelect;
