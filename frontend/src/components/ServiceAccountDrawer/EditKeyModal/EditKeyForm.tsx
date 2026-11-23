import type { Control, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { LockKeyhole, Trash2, X } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { ToggleGroup } from '@signozhq/ui/toggle-group';
import { DatePicker } from 'antd';
import type { ServiceaccounttypesGettableFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import {
	buildAPIKeyDeletePermission,
	buildAPIKeyUpdatePermission,
	buildSADetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/service-account.permissions';
import { popupContainer } from 'utils/selectPopupContainer';

import { disabledDate, formatLastObservedAt } from '../utils';
import type { FormValues } from './types';
import { ExpiryMode, FORM_ID } from './types';

export interface EditKeyFormProps {
	register: UseFormRegister<FormValues>;
	control: Control<FormValues>;
	expiryMode: ExpiryMode;
	keyItem: ServiceaccounttypesGettableFactorAPIKeyDTO | null;
	onSubmit: () => void;
	formatTimezoneAdjustedTimestamp: (ts: string, format: string) => string;
	canUpdate?: boolean;
	isUpdateDenied?: boolean;
}

function EditKeyForm({
	register,
	control,
	expiryMode,
	keyItem,
	onSubmit,
	formatTimezoneAdjustedTimestamp,
	canUpdate = true,
	isUpdateDenied = false,
}: EditKeyFormProps): JSX.Element {
	return (
		<form id={FORM_ID} className="edit-key-modal__form" onSubmit={onSubmit}>
			<div className="edit-key-modal__field">
				<label className="edit-key-modal__label" htmlFor="edit-key-name">
					Name
				</label>
				{!canUpdate ? (
					<AuthZTooltip
						checks={[buildAPIKeyUpdatePermission(keyItem?.id ?? '')]}
						enabled={!!keyItem?.id}
						withPortal={false}
					>
						<div className="edit-key-modal__key-display">
							<span className="edit-key-modal__id-text">{keyItem?.name || '—'}</span>
							<LockKeyhole size={12} className="edit-key-modal__lock-icon" />
						</div>
					</AuthZTooltip>
				) : (
					<Input
						id="edit-key-name"
						placeholder="Enter key name"
						{...register('name')}
					/>
				)}
			</div>

			<div className="edit-key-modal__field">
				<label className="edit-key-modal__label" htmlFor="edit-key-id">
					ID
				</label>
				<div id="edit-key-id" className="edit-key-modal__key-display">
					<span className="edit-key-modal__id-text">{keyItem?.id || '—'}</span>
					<LockKeyhole size={12} className="edit-key-modal__lock-icon" />
				</div>
			</div>

			<div className="edit-key-modal__field">
				<label className="edit-key-modal__label" htmlFor="edit-key-display">
					Key
				</label>
				<div id="edit-key-display" className="edit-key-modal__key-display">
					<span className="edit-key-modal__key-text">********************</span>
					<LockKeyhole size={12} className="edit-key-modal__lock-icon" />
				</div>
			</div>

			<div className="edit-key-modal__field">
				<span className="edit-key-modal__label">Expiration</span>
				<Controller
					name="expiryMode"
					control={control}
					render={({ field }): JSX.Element => (
						<ToggleGroup
							variant="outlined"
							color="secondary"
							type="single"
							value={field.value}
							onChange={(val: string): void => {
								if (val && canUpdate) {
									field.onChange(val);
								}
							}}
							size="sm"
							disabled={!canUpdate}
							disabledTooltip={
								isUpdateDenied
									? 'You do not have permission to update this key'
									: undefined
							}
							width="60%"
							items={[
								{ value: ExpiryMode.NONE, label: 'No Expiration' },
								{ value: ExpiryMode.DATE, label: 'Set Expiration Date' },
							]}
						/>
					)}
				/>
			</div>

			{expiryMode === ExpiryMode.DATE && (
				<div className="edit-key-modal__field">
					<label className="edit-key-modal__label" htmlFor="edit-key-datepicker">
						Expiration Date
					</label>
					<div className="edit-key-modal__datepicker">
						<Controller
							name="expiresAt"
							control={control}
							render={({ field }): JSX.Element => (
								<DatePicker
									value={field.value}
									id="edit-key-datepicker"
									onChange={field.onChange}
									popupClassName="edit-key-modal-datepicker-popup"
									getPopupContainer={popupContainer}
									disabledDate={disabledDate}
									disabled={!canUpdate}
								/>
							)}
						/>
					</div>
				</div>
			)}

			<div className="edit-key-modal__meta">
				<span className="edit-key-modal__meta-label">Last Observed At</span>
				<Badge textTransform="none" variant="solid" color="secondary">
					{formatLastObservedAt(
						keyItem?.lastObservedAt ?? null,
						formatTimezoneAdjustedTimestamp,
					)}
				</Badge>
			</div>
		</form>
	);
}

export interface EditKeyFooterPrefixProps {
	keyId?: string;
	accountId?: string;
	onRevokeClick: () => void;
}

export function EditKeyFooterPrefix({
	keyId,
	accountId,
	onRevokeClick,
}: EditKeyFooterPrefixProps): JSX.Element {
	return (
		<AuthZButton
			size="md"
			checks={[
				buildAPIKeyDeletePermission(keyId ?? ''),
				buildSADetachPermission(accountId ?? ''),
			]}
			authZEnabled={!!accountId && !!keyId}
			variant="link"
			color="danger"
			onClick={onRevokeClick}
			prefix={<Trash2 size={12} />}
		>
			Revoke Key
		</AuthZButton>
	);
}

export interface EditKeyFooterProps {
	keyId?: string;
	accountId?: string;
	isSaving: boolean;
	isDirty: boolean;
	onClose: () => void;
}

export function EditKeyFooter({
	keyId,
	accountId,
	isSaving,
	isDirty,
	onClose,
}: EditKeyFooterProps): JSX.Element {
	return (
		<>
			<Button
				size="md"
				variant="solid"
				color="secondary"
				onClick={onClose}
				prefix={<X size={12} />}
			>
				Cancel
			</Button>
			<AuthZButton
				size="md"
				checks={[buildAPIKeyUpdatePermission(keyId ?? '')]}
				authZEnabled={!!accountId && !!keyId}
				type="submit"
				form={FORM_ID}
				variant="solid"
				color="primary"
				loading={isSaving}
				disabled={!isDirty}
			>
				Save Changes
			</AuthZButton>
		</>
	);
}

export default EditKeyForm;
