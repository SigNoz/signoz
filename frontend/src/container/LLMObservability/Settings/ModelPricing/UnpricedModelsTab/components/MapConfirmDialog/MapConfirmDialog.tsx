import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Typography } from '@signozhq/ui/typography';
import { ArrowRight, Check, Link2, X } from '@signozhq/icons';
import { startCase } from 'lodash-es';

import styles from './MapConfirmDialog.module.scss';
import type {
	PricingRule,
	UnpricedModel,
} from 'container/LLMObservability/Settings/ModelPricing/types';
import {
	formatPricePerMillion,
	getCanonicalId,
	getExtraBuckets,
} from 'container/LLMObservability/Settings/ModelPricing/utils';

interface MapConfirmDialogProps {
	open: boolean;
	model: UnpricedModel;
	rule: PricingRule;
	isSaving: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

// Per-row confirm step before mapping an unpriced model onto an existing billing
// model. Mapping appends the span's model name as a match pattern on the chosen
// rule, so the model inherits that rule's pricing — shown here so the user can
// eyeball the rates before committing. Dismissible (outside click / close), since
// mapping is reversible (re-map or edit the rule's patterns afterwards).
function MapConfirmDialog({
	open,
	model,
	rule,
	isSaving,
	onConfirm,
	onCancel,
}: MapConfirmDialogProps): JSX.Element {
	const extraBuckets = getExtraBuckets(rule);

	const pricingRows = [
		{ key: 'input', label: 'Input / 1M', value: rule.pricing?.input },
		{ key: 'output', label: 'Output / 1M', value: rule.pricing?.output },
		...extraBuckets.map((bucket) => ({
			key: bucket.key,
			label: startCase(bucket.key),
			value: bucket.pricePerMillion,
		})),
	];

	const footer = (
		<div className={styles.footer}>
			<Button
				variant="outlined"
				color="secondary"
				onClick={onCancel}
				disabled={isSaving}
				prefix={<X size={12} />}
				testId="unpriced-map-cancel-btn"
			>
				Cancel
			</Button>
			<Button
				variant="solid"
				color="primary"
				loading={isSaving}
				onClick={onConfirm}
				prefix={<Check size={12} />}
				testId="unpriced-map-confirm-btn"
			>
				Map model
			</Button>
		</div>
	);

	return (
		<DialogWrapper
			open={open}
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onCancel();
				}
			}}
			width="base"
			title="Map to billing model"
			titleIcon={<Link2 size={16} />}
			footer={footer}
			testId="unpriced-map-confirm-dialog"
		>
			<div className={styles.body}>
				<Typography.Text as="p" size="small" color="muted">
					Spans from this model will be priced using the selected billing model.
				</Typography.Text>

				<div className={styles.mapping}>
					<Typography.Text
						weight="semibold"
						testId={`unpriced-map-confirm-item-${model.modelName}`}
					>
						{model.modelName}
					</Typography.Text>
					<ArrowRight size={14} className={styles.arrow} />
					<Typography.Text weight="semibold">{getCanonicalId(rule)}</Typography.Text>
				</div>

				<div className={styles.pricing}>
					{pricingRows.map((row) => (
						<div className={styles.pricingRow} key={row.key}>
							<Typography.Text as="span" size="small" color="muted">
								{row.label}
							</Typography.Text>
							<Typography.Text as="span" size="small" weight="semibold">
								{formatPricePerMillion(row.value)}
							</Typography.Text>
						</div>
					))}
				</div>
			</div>
		</DialogWrapper>
	);
}

export default MapConfirmDialog;
