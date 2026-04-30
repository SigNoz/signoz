import type { Control, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { LockKeyhole, Trash2, X } from '@signozhq/icons';
import {
	Badge,
	Button,
	Input,
	ToggleGroup,
	ToggleGroupItem,
} from '@signozhq/ui';
import { DatePicker } from 'antd';
import type { ServiceaccounttypesGettableFactorAPIKeyDTO } from 'api/generated/services/sigNoz.schemas';
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
}: EditKeyFormProps): JSX.Element {
	return (
		<>
			<form id={FORM_ID} className="edit-key-modal__form" onSubmit={onSubmit}>
				<div className="edit-key-modal__field">
					<label className="edit-key-modal__label" htmlFor="edit-key-name">
						Name
					</label>
					<Input
						id="edit-key-name"
						className="edit-key-modal__input"
						placeholder="Enter key name"
						{...register('name')}
					/>
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
									if (val) {
										field.onChange(val);
									}
								}}
								size="sm"
								className="edit-key-modal__expiry-toggle"
							>
								<ToggleGroupItem
									value={ExpiryMode.NONE}
									className="edit-key-modal__expiry-toggle-btn"
								>
									No Expiration
								</ToggleGroupItem>
								<ToggleGroupItem
									value={ExpiryMode.DATE}
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
				<Button variant="link" color="destructive" onClick={onRevokeClick}>
					<Trash2 size={12} />
					Revoke Key
				</Button>
				<div className="edit-key-modal__footer-right">
					<Button variant="solid" color="secondary" onClick={onClose}>
						<X size={12} />
						Cancel
					</Button>
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
				</div>
			</div>
		</>
	);
}

export default EditKeyForm;
