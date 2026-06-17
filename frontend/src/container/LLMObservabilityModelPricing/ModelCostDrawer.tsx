import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Trash2 } from '@signozhq/icons';

import PatternEditor from './PatternEditor';
import PricingFields from './PricingFields';
import SourceSelector from './SourceSelector';
import { PROVIDER_OPTIONS } from './constants';
import { validateDraft } from './utils';
import type { DrawerDraft, DrawerMode } from './types';
import './ModelCostDrawer.styles.scss';

interface ModelCostDrawerProps {
	isOpen: boolean;
	mode: DrawerMode;
	draft: DrawerDraft;
	setDraft: (next: DrawerDraft) => void;
	onClose: () => void;
	onSave: () => void;
	onDelete: () => void;
	isSaving: boolean;
	isDeleting: boolean;
	saveError: string | null;
	canManage: boolean;
}

function ModelCostDrawer({
	isOpen,
	mode,
	draft,
	setDraft,
	onClose,
	onSave,
	onDelete,
	isSaving,
	isDeleting,
	saveError,
	canManage,
}: ModelCostDrawerProps): JSX.Element {
	// Metadata (model id / provider / patterns / source) is editable by any
	// manager. Pricing fields are editable only once the user picks "User
	// override" — auto-populated pricing is managed by SigNoz. Write APIs are
	// Admin-only, so non-managers can't edit anything.
	const metadataReadOnly = !canManage;
	const pricingReadOnly = !canManage || !draft.isOverride;

	const validation = validateDraft(draft, mode);
	const showValidationTooltip =
		canManage && !validation.ok && !!validation.message;

	const update = (patch: Partial<DrawerDraft>): void => {
		setDraft({ ...draft, ...patch });
	};

	const footer = (
		<div className="model-cost-drawer__footer">
			{mode === 'edit' && canManage && (
				<Button
					variant="ghost"
					color="destructive"
					prefix={<Trash2 size={14} />}
					onClick={onDelete}
					loading={isDeleting}
					testId="drawer-delete-btn"
				>
					Delete
				</Button>
			)}
			<div className="model-cost-drawer__footer-right">
				<Button
					variant="outlined"
					color="secondary"
					onClick={onClose}
					testId="drawer-cancel-btn"
				>
					{canManage ? 'Cancel' : 'Close'}
				</Button>
				{canManage && (
					<TooltipSimple
						title={showValidationTooltip ? validation.message : ''}
						withPortal={false}
					>
						{/* span wrapper so the tooltip fires even when the button is disabled */}
						<span className="model-cost-drawer__save-wrap">
							<Button
								variant="solid"
								color="primary"
								onClick={onSave}
								loading={isSaving}
								disabled={!validation.ok}
								testId="drawer-save-btn"
							>
								Save
							</Button>
						</span>
					</TooltipSimple>
				)}
			</div>
		</div>
	);

	return (
		<DrawerWrapper
			open={isOpen}
			onOpenChange={(open): void => {
				if (!open) {
					onClose();
				}
			}}
			direction="right"
			width="base"
			className="model-cost-drawer"
			footer={footer}
			title={mode === 'edit' ? 'Edit model cost' : 'Add model cost'}
			subTitle="Pricing computes gen_ai.estimated_total_cost at ingest."
			drawerHeaderProps={{ className: 'model-cost-drawer__title' }}
		>
			<div className="drawer-section">
				<label htmlFor="billing-model-id">Billing model ID</label>
				<Input
					id="billing-model-id"
					placeholder="e.g. openai:gpt-4o"
					value={draft.modelName}
					disabled={mode === 'edit' || metadataReadOnly}
					onChange={(e): void => update({ modelName: e.target.value })}
					testId="drawer-model-id-input"
				/>
			</div>

			<div className="drawer-section">
				<label htmlFor="provider-select">Provider</label>
				<SelectSimple
					id="provider-select"
					value={draft.provider}
					onChange={(value): void => update({ provider: value as string })}
					items={PROVIDER_OPTIONS}
					disabled={mode === 'edit' || metadataReadOnly}
					className="full-width"
					withPortal={false}
					testId="drawer-provider-select"
				/>
			</div>

			<PatternEditor
				patterns={draft.patterns}
				isReadOnly={metadataReadOnly}
				onChange={(patterns): void => update({ patterns })}
			/>

			<SourceSelector
				isOverride={draft.isOverride}
				isReadOnly={metadataReadOnly}
				disableAuto={mode === 'add'}
				onChange={(isOverride): void => update({ isOverride })}
			/>

			<PricingFields
				pricing={draft.pricing}
				isReadOnly={pricingReadOnly}
				onChange={(patch): void =>
					setDraft({ ...draft, pricing: { ...draft.pricing, ...patch } })
				}
			/>

			{saveError && (
				<div className="drawer-error" role="alert">
					{saveError}
				</div>
			)}
		</DrawerWrapper>
	);
}

export default ModelCostDrawer;
