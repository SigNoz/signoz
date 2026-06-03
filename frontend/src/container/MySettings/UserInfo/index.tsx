import { useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import {
	updateMyPassword,
	useUpdateMyUserV2,
} from 'api/generated/services/users';
import { toast } from '@signozhq/ui/sonner';
import { Check, FileTerminal, Mail, User } from '@signozhq/icons';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { ErrorV2Resp } from 'types/api';
import { AxiosError } from 'axios';

import '../MySettings.styles.scss';
import './UserInfo.styles.scss';

function UserInfo(): JSX.Element {
	const { user, org, updateUser } = useAppContext();

	const { showErrorModal } = useErrorModal();
	const { mutateAsync: updateMyUser } = useUpdateMyUserV2();

	const [currentPassword, setCurrentPassword] = useState<string>('');
	const [updatePassword, setUpdatePassword] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const [changedName, setChangedName] = useState<string>(
		user?.displayName || '',
	);

	const [isUpdateNameModalOpen, setIsUpdateNameModalOpen] =
		useState<boolean>(false);
	const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
		useState<boolean>(false);

	const defaultPlaceHolder = '*************';

	if (!user) {
		return <div />;
	}

	const hideUpdateNameModal = (): void => {
		setIsUpdateNameModalOpen(false);
	};

	const hideResetPasswordModal = (): void => {
		setIsResetPasswordModalOpen(false);
		setCurrentPassword('');
		setUpdatePassword('');
	};

	const onChangePasswordClickHandler = async (): Promise<void> => {
		try {
			setIsLoading(true);

			await updateMyPassword({
				newPassword: updatePassword,
				oldPassword: currentPassword,
			});
			toast.success('Password updated successfully');
			hideResetPasswordModal();
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			try {
				ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
			} catch (apiError) {
				showErrorModal(apiError as APIError);
			}
		}
	};

	const passwordsMatch =
		currentPassword.length > 0 &&
		updatePassword.length > 0 &&
		currentPassword === updatePassword;

	const isResetPasswordDisabled =
		isLoading ||
		currentPassword.length === 0 ||
		updatePassword.length === 0 ||
		passwordsMatch;

	const onSaveHandler = async (): Promise<void> => {
		void logEvent('Account Settings: Name Updated', {
			name: changedName,
		});
		void logEvent(
			'Account Settings: Name Updated',
			{
				name: changedName,
			},
			'identify',
		);
		try {
			setIsLoading(true);
			await updateMyUser({ data: { displayName: changedName } });

			toast.success('Name updated successfully');
			updateUser({
				...user,
				displayName: changedName,
			});
			setIsLoading(false);
			hideUpdateNameModal();
		} catch (error) {
			try {
				ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
			} catch (apiError) {
				showErrorModal(apiError as APIError);
			}
		}
		setIsLoading(false);
	};

	if (!user || !org) {
		return <div />;
	}

	return (
		<div className="user-info-card">
			<div className="user-info">
				<div className="user-name">{user.displayName}</div>

				<div className="user-info-subsection">
					<div className="user-email">
						<Mail size={16} /> {user.email}
					</div>

					<div className="user-role">
						<User size={16} /> {user.role.toLowerCase()}
					</div>
				</div>
			</div>

			<div className="user-info-update-section">
				<Button
					type="default"
					className="periscope-btn secondary"
					icon={<FileTerminal size={16} />}
					onClick={(): void => setIsUpdateNameModalOpen(true)}
				>
					Update name
				</Button>

				<Button
					type="default"
					className="periscope-btn secondary"
					icon={<FileTerminal size={16} />}
					onClick={(): void => setIsResetPasswordModalOpen(true)}
				>
					Reset password
				</Button>
			</div>

			<Modal
				className="update-name-modal"
				title={<span className="title">Update name</span>}
				open={isUpdateNameModalOpen}
				closable
				onCancel={hideUpdateNameModal}
				footer={[
					<Button
						key="submit"
						type="primary"
						icon={<Check size={16} />}
						onClick={onSaveHandler}
						loading={isLoading}
						data-testid="update-name-btn"
					>
						Update name
					</Button>,
				]}
			>
				<Typography.Text>Name</Typography.Text>
				<div className="update-name-input">
					<Input
						placeholder="e.g. John Doe"
						value={changedName}
						disabled={isLoading}
						onChange={(e): void => setChangedName(e.target.value)}
						onPressEnter={(): void => {
							void onSaveHandler();
						}}
					/>
				</div>
			</Modal>

			<Modal
				className="reset-password-modal"
				title={<span className="title">Reset password</span>}
				open={isResetPasswordModalOpen}
				closable
				destroyOnClose
				onCancel={hideResetPasswordModal}
				footer={[
					<Button
						key="submit"
						className={`periscope-btn ${
							isResetPasswordDisabled ? 'secondary' : 'primary'
						}`}
						icon={<Check size={16} />}
						onClick={onChangePasswordClickHandler}
						loading={isLoading}
						disabled={isResetPasswordDisabled}
						data-testid="reset-password-btn"
					>
						Reset password
					</Button>,
				]}
			>
				<div className="reset-password-container">
					<div className="current-password-input">
						<Typography.Text>Current password</Typography.Text>
						<Input.Password
							data-testid="current-password-textbox"
							disabled={isLoading}
							placeholder={defaultPlaceHolder}
							onChange={(event): void => {
								setCurrentPassword(event.target.value);
							}}
							value={currentPassword}
							type="password"
							autoComplete="off"
							visibilityToggle
							onPressEnter={(): void => {
								if (!isResetPasswordDisabled) {
									void onChangePasswordClickHandler();
								}
							}}
						/>
					</div>

					<div className="new-password-input">
						<Typography.Text>New password</Typography.Text>
						<Input.Password
							data-testid="new-password-textbox"
							disabled={isLoading}
							placeholder={defaultPlaceHolder}
							onChange={(event): void => {
								const updatedValue = event.target.value;
								setUpdatePassword(updatedValue);
							}}
							value={updatePassword}
							type="password"
							autoComplete="off"
							visibilityToggle={false}
							status={passwordsMatch ? 'error' : ''}
							onPressEnter={(): void => {
								if (!isResetPasswordDisabled) {
									void onChangePasswordClickHandler();
								}
							}}
						/>
						{passwordsMatch && (
							<span className="password-error-text">
								New password must be different from current password
							</span>
						)}
					</div>
				</div>
			</Modal>
		</div>
	);
}

export default UserInfo;
