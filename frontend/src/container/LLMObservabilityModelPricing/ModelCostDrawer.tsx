import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Trash2 } from '@signozhq/icons';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import PatternEditor from './PatternEditor';
import PricingFields from './PricingFields';
import SourceSelector from './SourceSelector';
import { PROVIDER_OPTIONS } from './constants';
import { validateModelName, validatePricing, validateProvider } from './utils';
import type { DrawerDraft, DrawerMode } from './types';
import './ModelCostDrawer.styles.scss';

interface ModelCostDrawerProps {
	isOpen: boolean;
	mode: DrawerMode;
	initialDraft: DrawerDraft;
	onClose: () => void;
	onSave: (draft: DrawerDraft) => void;
	onDelete: () => void;
	isSaving: boolean;
	isDeleting: boolean;
	saveError: string | null;
	canManage: boolean;
}

function ModelCostDrawer({
	isOpen,
	mode,
	initialDraft,
	onClose,
	onSave,
	onDelete,
	isSaving,
	isDeleting,
	saveError,
	canManage,
}: ModelCostDrawerProps): JSX.Element {
	const {
		control,
		handleSubmit,
		watch,
		reset,
		formState: { isValid, errors },
	} = useForm<DrawerDraft>({
		mode: 'onChange',
		defaultValues: initialDraft,
	});

	// The drawer stays mounted while closed, so re-seed the form whenever it
	// reopens — otherwise edit shows stale data and values leak between opens.
	// reset() under mode: 'onChange' also recomputes isValid, so the Save button's
	// disabled state is correct from the first render.
	useEffect(() => {
		if (isOpen) {
			reset(initialDraft);
		}
	}, [isOpen, initialDraft, reset]);

	const isOverride = watch('isOverride');

	// Metadata (model id / provider / patterns / source) is editable by any
	// manager. Pricing fields are editable only once the user picks "User
	// override" — auto-populated pricing is managed by SigNoz. Write APIs are
	// Admin-only, so non-managers can't edit anything.
	const metadataReadOnly = !canManage;
	const pricingReadOnly = !canManage || !isOverride;

	// Non-managers can only view (write APIs are Admin-only), so the drawer is a
	// read-only "View" rather than "Edit"/"Add".
	let drawerTitle = 'Add model cost';
	if (!canManage) {
		drawerTitle = 'View model cost';
	} else if (mode === 'edit') {
		drawerTitle = 'Edit model cost';
	}

	// Surface the first failing field (in form order) on the disabled Save button.
	const validationMessage =
		errors.modelName?.message ||
		errors.provider?.message ||
		errors.pricing?.message;
	const showValidationTooltip = canManage && !isValid && !!validationMessage;

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
						title={showValidationTooltip ? validationMessage : ''}
						withPortal={false}
					>
						{/* span wrapper so the tooltip fires even when the button is disabled */}
						<span className="model-cost-drawer__save-wrap">
							<Button
								variant="solid"
								color="primary"
								onClick={handleSubmit(onSave)}
								loading={isSaving}
								disabled={!isValid}
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
			title={drawerTitle}
			subTitle="Pricing computes gen_ai.estimated_total_cost at ingest."
			drawerHeaderProps={{ className: 'model-cost-drawer__title' }}
		>
			<div className="drawer-section">
				<label htmlFor="billing-model-id">Billing model ID</label>
				<Controller
					name="modelName"
					control={control}
					rules={{
						validate: (value): true | string => validateModelName(value, mode),
					}}
					render={({ field }): JSX.Element => (
						<Input
							id="billing-model-id"
							placeholder="e.g. openai:gpt-4o"
							value={field.value}
							disabled={mode === 'edit' || metadataReadOnly}
							onChange={(e): void => field.onChange(e.target.value)}
							testId="drawer-model-id-input"
						/>
					)}
				/>
			</div>

			<div className="drawer-section">
				<label htmlFor="provider-select">Provider</label>
				<Controller
					name="provider"
					control={control}
					rules={{ validate: validateProvider }}
					render={({ field }): JSX.Element => (
						<SelectSimple
							id="provider-select"
							value={field.value}
							onChange={(value): void => field.onChange(value as string)}
							items={PROVIDER_OPTIONS}
							disabled={mode === 'edit' || metadataReadOnly}
							className="full-width"
							withPortal={false}
							testId="drawer-provider-select"
						/>
					)}
				/>
			</div>

			<Controller
				name="patterns"
				control={control}
				render={({ field }): JSX.Element => (
					<PatternEditor
						patterns={field.value}
						isReadOnly={metadataReadOnly}
						onChange={field.onChange}
					/>
				)}
			/>

			{/* Source is auto vs. override — a choice only a manager can make, so
			    there's nothing to show a read-only viewer. */}
			{canManage && (
				<Controller
					name="isOverride"
					control={control}
					// Pricing requirements depend on this toggle, so re-validate pricing
					// whenever the source changes (keeps the Save button in sync).
					rules={{ deps: ['pricing'] }}
					render={({ field }): JSX.Element => (
						<SourceSelector
							isOverride={field.value}
							isReadOnly={metadataReadOnly}
							disableAuto={mode === 'add'}
							onChange={field.onChange}
						/>
					)}
				/>
			)}

			<Controller
				name="pricing"
				control={control}
				rules={{
					validate: (value, values): true | string =>
						validatePricing(value, values.isOverride),
				}}
				render={({ field }): JSX.Element => (
					<PricingFields
						pricing={field.value}
						isReadOnly={pricingReadOnly}
						onChange={(patch): void => field.onChange({ ...field.value, ...patch })}
					/>
				)}
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
