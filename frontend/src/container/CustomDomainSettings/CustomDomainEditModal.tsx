import { useEffect, useState } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Input, Modal, Typography } from 'antd';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import LaunchChatSupport from 'components/LaunchChatSupport/LaunchChatSupport';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface CustomDomainEditModalProps {
	isOpen: boolean;
	onClose: () => void;
	customDomainSubdomain?: string;
	dnsSuffix: string;
	isLoading: boolean;
	updateDomainError: AxiosError<RenderErrorResponseDTO> | null;
	onClearError: () => void;
	onSubmit: (subdomain: string) => void;
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function CustomDomainEditModal({
	isOpen,
	onClose,
	customDomainSubdomain,
	dnsSuffix,
	isLoading,
	updateDomainError,
	onClearError,
	onSubmit,
}: CustomDomainEditModalProps): JSX.Element {
	const [value, setValue] = useState(customDomainSubdomain ?? '');
	const [validationError, setValidationError] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			setValue(customDomainSubdomain ?? '');
		}
	}, [isOpen, customDomainSubdomain]);

	const handleClose = (): void => {
		setValidationError(null);
		onClearError();
		onClose();
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		setValue(e.target.value);
		setValidationError(null);
		onClearError();
	};

	const handleSubmit = (): void => {
		if (!value) {
			setValidationError('This field is required');
			return;
		}
		if (value.length < 3) {
			setValidationError('Minimum 3 characters required');
			return;
		}
		onSubmit(value);
	};

	const is409 = updateDomainError?.status === 409;
	const apiErrorMessage = (updateDomainError?.response
		?.data as RenderErrorResponseDTO)?.error?.message;
	const isError = !!(validationError || (updateDomainError && !is409));
	const errorMessage =
		validationError ||
		(is409
			? apiErrorMessage ||
			  "You've already updated the custom domain once today. Please contact support."
			: apiErrorMessage) ||
		null;

	const statusIcon = isLoading ? (
		<Loader2 size={16} className="animate-spin edit-modal-status-icon" />
	) : isError || is409 ? (
		<AlertCircle size={16} color={Color.BG_CHERRY_500} />
	) : (
		<CheckCircle2 size={16} color={Color.BG_FOREST_500} />
	);

	return (
		<Modal
			className="edit-workspace-modal"
			title="Edit Workspace Link"
			open={isOpen}
			onCancel={handleClose}
			destroyOnClose
			footer={null}
			width={512}
		>
			<p className="edit-modal-description">
				Enter your preferred subdomain to create a unique URL for your team. Need
				help?{' '}
				<Typography.Link
					href="https://signoz.io/support"
					target="_blank"
					rel="noreferrer"
				>
					Contact support.
				</Typography.Link>
			</p>

			<div className="edit-modal-field">
				<span
					className={`edit-modal-label${
						isError || is409 ? ' edit-modal-label--error' : ''
					}`}
				>
					Workspace URL
				</span>

				<div
					className={`edit-modal-input-wrapper${
						isError ? ' edit-modal-input-wrapper--error' : ''
					}`}
				>
					<Input
						prefix={statusIcon}
						value={value}
						onChange={handleChange}
						onPressEnter={handleSubmit}
						autoFocus
					/>
					<div className="edit-modal-input-suffix">{dnsSuffix}</div>
				</div>

				<span
					className={`edit-modal-helper${
						isError || is409 ? ' edit-modal-helper--error' : ''
					}`}
				>
					{isError || is409
						? errorMessage
						: "To help you easily explore SigNoz, we've selected a tenant sub domain name for you."}
				</span>
			</div>

			<div className="edit-modal-note">
				<span className="edit-modal-note-emoji">🚧</span>
				<Typography.Text className="edit-modal-note-text">
					Note that your previous URL still remains accessible. Your access
					credentials for the new URL remains the same.
				</Typography.Text>
			</div>

			<div className="edit-modal-footer">
				{is409 ? (
					<LaunchChatSupport
						attributes={{ screen: 'Custom Domain Settings' }}
						eventName="Custom Domain Settings: Facing Issues Updating Custom Domain"
						message="Hi Team, I need help with updating custom domain"
						buttonText="Contact Support"
					/>
				) : (
					<button
						type="button"
						className="edit-modal-apply-btn"
						onClick={handleSubmit}
						disabled={isLoading}
					>
						{isLoading ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							'Apply Changes'
						)}
					</button>
				)}
			</div>
		</Modal>
	);
}
