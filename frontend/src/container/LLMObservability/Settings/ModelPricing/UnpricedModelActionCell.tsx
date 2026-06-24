import { Button } from '@signozhq/ui/button';
import { ArrowRight } from '@signozhq/icons';
import { startCase } from 'lodash-es';

import styles from './LLMObservabilityModelPricing.module.scss';
import type { PricingRule, UnpricedModel } from './types';
import {
	formatPricePerMillion,
	getCanonicalId,
	getExtraBuckets,
} from './utils';

interface UnpricedModelActionCellProps {
	model: UnpricedModel;
	// The rule currently chosen in the row's "Map to billing model" dropdown.
	targetRule: PricingRule | undefined;
	isConfirming: boolean;
	isMapping: boolean;
	canManage: boolean;
	onStartConfirm: (modelName: string) => void;
	onCancelConfirm: () => void;
	onConfirm: (model: UnpricedModel) => void;
}

// Action column for an unpriced-model row: a "Map to model" button that expands
// into an inline confirmation panel summarising the target rule's pricing before
// the mapping is committed.
function UnpricedModelActionCell({
	model,
	targetRule,
	isConfirming,
	isMapping,
	canManage,
	onStartConfirm,
	onCancelConfirm,
	onConfirm,
}: UnpricedModelActionCellProps): JSX.Element | null {
	if (!canManage) {
		return null;
	}

	if (!isConfirming) {
		return (
			<Button
				variant="outlined"
				color="secondary"
				size="sm"
				suffix={<ArrowRight size={14} />}
				disabled={!targetRule}
				onClick={(): void => onStartConfirm(model.modelName)}
				testId={`map-to-model-${model.modelName}`}
			>
				Map to model
			</Button>
		);
	}

	// Defensive: the panel only opens when a target is selected, but guard anyway.
	if (!targetRule) {
		return null;
	}

	const extraBuckets = getExtraBuckets(targetRule);

	return (
		<div
			className={styles.confirmPanel}
			data-testid={`map-confirm-${model.modelName}`}
		>
			<div className={styles.confirmText}>
				Add <strong>{model.modelName}</strong> as a pattern to{' '}
				<strong>{getCanonicalId(targetRule)}</strong>?
			</div>
			<div className={styles.confirmPricing}>
				Pricing: {formatPricePerMillion(targetRule.pricing?.input)} input /{' '}
				{formatPricePerMillion(targetRule.pricing?.output)} output per 1M
				{extraBuckets.map((bucket) => (
					<span key={bucket.key} className={styles.confirmBucket}>
						{startCase(bucket.key)} {formatPricePerMillion(bucket.pricePerMillion)}
					</span>
				))}
			</div>
			<div className={styles.confirmActions}>
				<Button
					variant="solid"
					color="primary"
					size="sm"
					loading={isMapping}
					onClick={(): void => onConfirm(model)}
					testId={`map-confirm-btn-${model.modelName}`}
				>
					Confirm
				</Button>
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					disabled={isMapping}
					onClick={onCancelConfirm}
					testId={`map-cancel-btn-${model.modelName}`}
				>
					Cancel
				</Button>
			</div>
		</div>
	);
}

export default UnpricedModelActionCell;
