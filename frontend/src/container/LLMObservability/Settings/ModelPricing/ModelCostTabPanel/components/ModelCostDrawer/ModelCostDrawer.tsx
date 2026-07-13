import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import { Controller, useForm } from 'react-hook-form';

import PatternEditor from './components/PatternEditor';
import PricingFields from './components/PricingFields';
import SourceSelector from './components/SourceSelector';
import { PROVIDER_OPTIONS } from '../../../constants';
import styles from './ModelCostDrawer.module.scss';
import {
	validateModelName,
	validatePricing,
	validateProvider,
} from '../../../utils';
import type { DrawerDraft, DrawerMode } from '../../../types';

interface ModelCostDrawerProps {
	isOpen: boolean;
	mode: DrawerMode;
	initialDraft: DrawerDraft;
	onClose: () => void;
	onSave: (draft: DrawerDraft) => void;
	isSaving: boolean;
	saveError: string | null;
	canManage: boolean;
}

function ModelCostDrawer({
	isOpen,
	mode,
	initialDraft,
	onClose,
	onSave,
	isSaving,
	saveError,
	canManage,
}: ModelCostDrawerProps): JSX.Element {
	// Default mode validates on submit, then re-validates on change — so we don't
	// flag empty fields before the user has tried to save, but errors clear live
	// once they start fixing them.
	const {
		control,
		handleSubmit,
		watch,
		formState: { isDirty },
	} = useForm<DrawerDraft>({
		defaultValues: initialDraft,
	});

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

	const footer = (
		<div className={styles.footer}>
			<Button
				variant="outlined"
				color="secondary"
				onClick={onClose}
				testId="drawer-cancel-btn"
			>
				{canManage ? 'Cancel' : 'Close'}
			</Button>
			{canManage && (
				<Button
					variant="solid"
					color="primary"
					onClick={handleSubmit(onSave)}
					disabled={!isDirty}
					loading={isSaving}
					testId="drawer-save-btn"
				>
					Save
				</Button>
			)}
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
			className={styles.modelCostDrawer}
			footer={footer}
			title={drawerTitle}
			drawerHeaderProps={{ className: styles.title }}
		>
			<div className={styles.drawerSection}>
				<label htmlFor="billing-model-id">
					Billing model ID{' '}
					<span className={styles.required} aria-hidden="true">
						*
					</span>
				</label>
				<Controller
					name="modelName"
					control={control}
					rules={{
						validate: (value): true | string => validateModelName(value, mode),
					}}
					render={({ field, fieldState }): JSX.Element => (
						<>
							<Input
								id="billing-model-id"
								placeholder="e.g. openai:gpt-4o"
								required
								value={field.value}
								disabled={mode === 'edit' || metadataReadOnly}
								aria-invalid={!!fieldState.error}
								onChange={(e): void => field.onChange(e.target.value)}
								testId="drawer-model-id-input"
							/>
							{fieldState.error && (
								<Typography.Text as="p" size="small" color="danger" role="alert">
									{fieldState.error.message}
								</Typography.Text>
							)}
						</>
					)}
				/>
			</div>

			<div className={styles.drawerSection}>
				<label htmlFor="provider-select">Provider</label>
				<Controller
					name="provider"
					control={control}
					rules={{ validate: validateProvider }}
					render={({ field, fieldState }): JSX.Element => (
						<>
							<SelectSimple
								id="provider-select"
								value={field.value}
								onChange={(value): void => field.onChange(value as string)}
								items={PROVIDER_OPTIONS}
								disabled={mode === 'edit' || metadataReadOnly}
								className={styles.fullWidth}
								withPortal={false}
								testId="drawer-provider-select"
							/>
							{fieldState.error && (
								<Typography.Text size="small" color="danger" role="alert">
									{fieldState.error.message}
								</Typography.Text>
							)}
						</>
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
					// whenever the source changes (clears/sets the pricing error).
					rules={{ deps: ['pricing'] }}
					render={({ field }): JSX.Element => (
						<SourceSelector
							isOverride={field.value}
							isReadOnly={metadataReadOnly}
							disableAuto={mode === 'add' || !initialDraft.sourceId}
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
				render={({ field, fieldState }): JSX.Element => (
					<>
						<PricingFields
							pricing={field.value}
							isReadOnly={pricingReadOnly}
							onChange={(patch): void => field.onChange({ ...field.value, ...patch })}
						/>
						{fieldState.error && (
							<Typography.Text as="p" size="small" color="danger" role="alert">
								{fieldState.error.message}
							</Typography.Text>
						)}
					</>
				)}
			/>

			{saveError && (
				<Typography.Text as="p" size="small" color="danger" role="alert">
					{saveError}
				</Typography.Text>
			)}
		</DrawerWrapper>
	);
}

export default ModelCostDrawer;
