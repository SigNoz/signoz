import { useState } from 'react';
import {
	Combobox,
	ComboboxCommand,
	ComboboxContent,
	ComboboxCreateItem,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxSeparator,
	ComboboxTrigger,
} from '@signozhq/ui/combobox';
import { Plus } from '@signozhq/icons';
import { Skeleton } from 'antd';

import styles from './MapToBillingModelSelect.module.scss';
import { RULE_OPTIONS_LIMIT } from 'container/LLMObservability/Settings/ModelPricing/constants';
import type { PricingRule } from 'container/LLMObservability/Settings/ModelPricing/types';
import { getRuleOptionLabel } from 'container/LLMObservability/Settings/ModelPricing/utils';
import { usePendingMappingLabel } from 'container/LLMObservability/Settings/ModelPricing/UnpricedModelsTab/usePendingMappingStore';
import { useMapToBillingModelSearch } from './useMapToBillingModelSearch';

// One placeholder row per fetched option, so the skeleton height matches the
// loaded list. Stable keys derived from the fetch limit.
const SKELETON_ROW_KEYS = Array.from(
	{ length: RULE_OPTIONS_LIMIT },
	(_, index) => `skeleton-${index}`,
);

interface MapToBillingModelSelectProps {
	modelName: string;
	disabled: boolean;
	onSelect: (rule: PricingRule) => void;
	onCreateNew: () => void;
}

// Searchable, server-paged dropdown for picking the billing model an unpriced
// model maps onto. Only RULE_OPTIONS_LIMIT rules are fetched at a time; typing
// narrows the set via the rules API rather than client-side filtering, so cmdk's
// own filter is disabled (shouldFilter={false}). The dropdown is a pure picker —
// choosing a rule hands it up to the confirm dialog rather than persisting a
// selection here. The trigger only mirrors the staged pick (read from the
// pending-mapping store) while that dialog is open, reverting on confirm/cancel.
function MapToBillingModelSelect({
	modelName,
	disabled,
	onSelect,
	onCreateNew,
}: MapToBillingModelSelectProps): JSX.Element {
	const [open, setOpen] = useState(false);
	const { searchText, setSearchText, rules, rulesById, isFetching } =
		useMapToBillingModelSearch(open);
	const selectedLabel = usePendingMappingLabel(modelName);

	const handleSelect = (ruleId: string): void => {
		const rule = rulesById.get(ruleId);
		if (rule) {
			onSelect(rule);
		}
		setOpen(false);
	};

	const handleCreateNew = (): void => {
		setOpen(false);
		onCreateNew();
	};

	return (
		<div className={styles.mapToCell}>
			<Combobox open={open} onOpenChange={setOpen}>
				<ComboboxTrigger
					className={styles.mapToSelect}
					disabled={disabled}
					placeholder="Select / Create a pricing model"
					value={selectedLabel}
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
									onSelect={(): void => handleSelect(rule.id)}
									data-testid={`map-to-option-${rule.id}`}
								>
									{getRuleOptionLabel(rule)}
								</ComboboxItem>
							))}
							{isFetching && (
								<div
									className={styles.skeletonList}
									data-testid={`map-to-loading-${modelName}`}
								>
									{SKELETON_ROW_KEYS.map((key) => (
										<Skeleton.Input
											key={key}
											active
											block
											size="small"
											className={styles.skeletonRow}
										/>
									))}
								</div>
							)}
							{!isFetching && rules.length === 0 && (
								<ComboboxEmpty>No billing models found</ComboboxEmpty>
							)}
						</ComboboxList>
						{/* Kept outside ComboboxList so it stays pinned as a footer while the
						    options scroll. Escape hatch when no existing billing model fits:
						    define this model's own pricing rather than mapping onto another. */}
						<ComboboxSeparator alwaysRender />
						<ComboboxCreateItem
							inputValue={modelName}
							value={`create-pricing-${modelName}`}
							prefix={<Plus size={14} />}
							onSelect={handleCreateNew}
							testId={`map-to-create-${modelName}`}
						>
							Create pricing for &quot;{modelName}&quot;
						</ComboboxCreateItem>
					</ComboboxCommand>
				</ComboboxContent>
			</Combobox>
		</div>
	);
}

export default MapToBillingModelSelect;
