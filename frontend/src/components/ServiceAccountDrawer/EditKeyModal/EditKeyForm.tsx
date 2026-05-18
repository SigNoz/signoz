import type { Control, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { LockKeyhole, Trash2, X } from '@signozhq/icons';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui/toggle-group';
import { DatePicker } from 'antd';
import type { ServiceaccounttypesGettableFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
import AuthZTooltip from 'components/AuthZTooltip/AuthZTooltip';
import {
	buildAPIKeyDeletePermission,
	buildAPIKeyUpdatePermission,
	buildSADetachPermission,
} from 'hooks/useAuthZ/permissions/service-account.permissions';
import { popupContainer } from 'utils/selectPopupContainer';

import { disabledDate, formatLastObservedAt } from '../utils';
import type { FormValues } from './types';
import { ExpiryMode, FORM_ID } from './types';

export interface EditKeyFormProps {
	register: UseFormRegister<FormValues>;
	control: Control<FormValues>;
	expiryMode: ExpiryMode;
	keyItem: ServiceaccounttypesGettableFactorAPIKeyDTO | null;
	isSaving: boolean;
	isDirty: boolean;
	onSubmit: () => void;
	onClose: () => void;
	onRevokeClick: () => void;
	formatTimezoneAdjustedTimestamp: (ts: string, format: string) => string;
	canUpdate?: boolean;
	accountId?: string;
}

function EditKeyForm({
	register,
	control,
	expiryMode,
	keyItem,
	isSaving,
	isDirty,
	onSubmit,
	onClose,
	onRevokeClick,
	formatTimezoneAdjustedTimestamp,
	canUpdate = true,
	accountId = '',
}: EditKeyFormProps): JSX.Element {
	return (
		<>
			<form id={FORM_ID} className="edit-key-modal__form" onSubmit={onSubmit}>
				<div className="edit-key-modal__field">
					<label className="edit-key-modal__label" htmlFor="edit-key-name">
						Name
					</label>
					{!canUpdate ? (
						<AuthZTooltip
							checks={[buildAPIKeyUpdatePermission(keyItem?.id ?? '')]}
							enabled={!!keyItem?.id}
						>
							<div className="edit-key-modal__key-display">
								<span className="edit-key-modal__id-text">{keyItem?.name || '—'}</span>
								<LockKeyhole size={12} className="edit-key-modal__lock-icon" />
							</div>
						</AuthZTooltip>
					) : (
						<Input
							id="edit-key-name"
							className="edit-key-modal__input"
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
								type="single"
								value={field.value}
								onChange={(val): void => {
									if (val && canUpdate) {
										field.onChange(val);
									}
								}}
								className="edit-key-modal__expiry-toggle"
							>
								<ToggleGroupItem
									value={ExpiryMode.NONE}
									disabled={!canUpdate}
									className="edit-key-modal__expiry-toggle-btn"
								>
									No Expiration
								</ToggleGroupItem>
								<ToggleGroupItem
									value={ExpiryMode.DATE}
									disabled={!canUpdate}
									className="edit-key-modal__expiry-toggle-btn"
								>
									Set Expiration Date
								</ToggleGroupItem>
							</ToggleGroup>
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
					<Badge color="vanilla">
						{formatLastObservedAt(
							keyItem?.lastObservedAt ?? null,
							formatTimezoneAdjustedTimestamp,
						)}
					</Badge>
				</div>
			</form>

			<div className="edit-key-modal__footer">
				<AuthZTooltip
					checks={[
						buildAPIKeyDeletePermission(keyItem?.id ?? ''),
						buildSADetachPermission(accountId ?? ''),
					]}
					enabled={!!accountId && !!keyItem?.id}
				>
					<Button variant="link" color="destructive" onClick={onRevokeClick}>
						<Trash2 size={12} />
						Revoke Key
					</Button>
				</AuthZTooltip>
				<div className="edit-key-modal__footer-right">
					<Button variant="solid" color="secondary" onClick={onClose}>
						<X size={12} />
						Cancel
					</Button>
					<AuthZTooltip
						checks={[buildAPIKeyUpdatePermission(keyItem?.id ?? '')]}
						enabled={!!accountId && !!keyItem?.id}
					>
						<Button
							type="submit"
							// @ts-expect-error -- form prop not in @signozhq/ui Button type - TODO: Fix this - @SagarRajput
							form={FORM_ID}
							variant="solid"
							color="primary"
							loading={isSaving}
							disabled={!isDirty}
						>
							Save Changes
						</Button>
					</AuthZTooltip>
				</div>
			</div>
		</>
	);
}

export default EditKeyForm;
