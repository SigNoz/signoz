import type { Control, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Button, Input, ToggleGroup, ToggleGroupItem } from '@signozhq/ui';
import { DatePicker } from 'antd';
import { popupContainer } from 'utils/selectPopupContainer';

import { disabledDate } from '../utils';
import type { FormValues } from './types';
import { ExpiryMode, FORM_ID } from './types';

export interface KeyFormPhaseProps {
	register: UseFormRegister<FormValues>;
	control: Control<FormValues>;
	expiryMode: ExpiryMode;
	isSubmitting: boolean;
	isValid: boolean;
	onSubmit: () => void;
	onClose: () => void;
}

function KeyFormPhase({
	register,
	control,
	expiryMode,
	isSubmitting,
	isValid,
	onSubmit,
	onClose,
}: KeyFormPhaseProps): JSX.Element {
	return (
		<>
			<form id={FORM_ID} className="add-key-modal__form" onSubmit={onSubmit}>
				<div className="add-key-modal__field">
					<label className="add-key-modal__label" htmlFor="key-name">
						Name <span style={{ color: 'var(--destructive)' }}>*</span>
					</label>
					<Input
						id="key-name"
						placeholder="Enter key name e.g.: Service Owner"
						className="add-key-modal__input"
						{...register('keyName', {
							required: true,
							validate: (v) => !!v.trim(),
						})}
					/>
				</div>

				<div className="add-key-modal__field">
					<span className="add-key-modal__label">Expiration</span>
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
								className="add-key-modal__expiry-toggle"
							>
								<ToggleGroupItem
									value={ExpiryMode.NONE}
									className="add-key-modal__expiry-toggle-btn"
								>
									No Expiration
								</ToggleGroupItem>
								<ToggleGroupItem
									value={ExpiryMode.DATE}
									className="add-key-modal__expiry-toggle-btn"
								>
									Set Expiration Date
								</ToggleGroupItem>
							</ToggleGroup>
						)}
					/>
				</div>

				{expiryMode === ExpiryMode.DATE && (
					<div className="add-key-modal__field">
						<label className="add-key-modal__label" htmlFor="expiry-date">
							Expiration Date
						</label>
						<div className="add-key-modal__datepicker">
							<Controller
								name="expiryDate"
								control={control}
								render={({ field }): JSX.Element => (
									<DatePicker
										id="expiry-date"
										value={field.value}
										onChange={field.onChange}
										popupClassName="add-key-modal-datepicker-popup"
										getPopupContainer={popupContainer}
										disabledDate={disabledDate}
									/>
								)}
							/>
						</div>
					</div>
				)}
			</form>

			<div className="add-key-modal__footer">
				<div className="add-key-modal__footer-right">
					<Button variant="solid" color="secondary" size="sm" onClick={onClose}>
						Cancel
					</Button>
					<Button
						type="submit"
						// @ts-expect-error -- form prop not in @signozhq/ui Button type - TODO: Fix this - @SagarRajput
						form={FORM_ID}
						variant="solid"
						color="primary"
						size="sm"
						loading={isSubmitting}
						disabled={!isValid}
					>
						Create Key
					</Button>
				</div>
			</div>
		</>
	);
}

export default KeyFormPhase;
