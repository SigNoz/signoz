import { useState } from 'react';
import { Combobox } from '@signozhq/ui/combobox';
import type { ComboboxItemType } from '@signozhq/ui/combobox';
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
// narrows the set via the rules API rather than client-side filtering, so the
// combobox's own filter is disabled (searchInputProps.filter: false). The
// dropdown is a pure picker — choosing a rule hands it up to the confirm dialog
// rather than persisting a selection here (`value` is pinned to undefined). The
// trigger only mirrors the staged pick (read from the pending-mapping store, via
// `displayValue`) while that dialog is open, reverting on confirm/cancel.
function MapToBillingModelSelect({
	modelName,
	disabled,
	onSelect,
	onCreateNew,
}: MapToBillingModelSelectProps): JSX.Element {
	// The combobox owns its open state now, so the rules fetch is gated on the
	// first focus of the cell instead — closed rows still don't fan out requests
	// on mount, and react-query dedupes identical query keys across rows.
	const [hasInteracted, setHasInteracted] = useState(false);
	const { setSearchText, rules, rulesById, isFetching } =
		useMapToBillingModelSearch(hasInteracted);
	const selectedLabel = usePendingMappingLabel(modelName);

	const items: ComboboxItemType[] = rules.map((rule) => ({
		type: 'item',
		value: rule.id,
		label: getRuleOptionLabel(rule),
		testId: `map-to-option-${rule.id}`,
	}));

	const handleChange = (ruleId: string | undefined): void => {
		const rule = ruleId === undefined ? undefined : rulesById.get(ruleId);
		if (rule) {
			onSelect(rule);
		}
	};

	return (
		<div
			className={styles.mapToCell}
			onFocusCapture={(): void => setHasInteracted(true)}
		>
			<Combobox
				maxWidth={280}
				contentMaxWidth={280}
				placeholder="Select / Create a pricing model"
				items={items}
				value={undefined}
				displayValue={(): string | undefined => selectedLabel}
				onChange={handleChange}
				disabled={disabled}
				disabledTooltip={undefined}
				loading={isFetching}
				loadingContent={
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
				}
				noContent="No billing models found"
				searchInputProps={{
					placeholder: 'Search billing models',
					filter: false,
					onChange: setSearchText,
				}}
				// Escape hatch when no existing billing model fits: define this
				// model's own pricing rather than mapping onto another. Pinned under
				// the list, so it stays put while the options scroll.
				footerAction={{
					label: 'Create a new pricing model',
					prefix: <Plus size={14} />,
					onClick: onCreateNew,
					testId: `map-to-create-${modelName}`,
				}}
				testId={`map-to-select-${modelName}`}
			/>
		</div>
	);
}

export default MapToBillingModelSelect;
