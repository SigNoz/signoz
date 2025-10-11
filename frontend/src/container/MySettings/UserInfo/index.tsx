import '../MySettings.styles.scss';
import './UserInfo.styles.scss';

import { Button, Input, Modal, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import changeMyPassword from 'api/v1/factor_password/changeMyPassword';
import editUser from 'api/v1/user/id/update';
import { useNotifications } from 'hooks/useNotifications';
import { Check, FileTerminal, MailIcon, UserIcon } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import APIError from 'types/api/error';

function UserInfo(): JSX.Element {
	const { user, org, updateUser } = useAppContext();
	const { t } = useTranslation(['routes', 'settings', 'common']);

	const { notifications } = useNotifications();

	const [currentPassword, setCurrentPassword] = useState<string>('');
	const [updatePassword, setUpdatePassword] = useState<string>('');
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const [changedName, setChangedName] = useState<string>(
		user?.displayName || '',
	);

	const [isUpdateNameModalOpen, setIsUpdateNameModalOpen] = useState<boolean>(
		false,
	);
	const [
		isResetPasswordModalOpen,
		setIsResetPasswordModalOpen,
	] = useState<boolean>(false);

	const defaultPlaceHolder = '*************';

	if (!user) {
		return <div />;
	}

	const hideUpdateNameModal = (): void => {
		setIsUpdateNameModalOpen(false);
	};

	const hideResetPasswordModal = (): void => {
		setIsResetPasswordModalOpen(false);
	};

	const onChangePasswordClickHandler = async (): Promise<void> => {
		try {
			setIsLoading(true);

			await changeMyPassword({
				newPassword: updatePassword,
				oldPassword: currentPassword,
				userId: user.id,
			});
			notifications.success({
				message: t('success', {
					ns: 'common',
				}),
			});
			hideResetPasswordModal();
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			notifications.error({
				message: (error as APIError).error.error.code,
				description: (error as APIError).error.error.message,
			});
		}
	};

	const isResetPasswordDisabled =
		isLoading ||
		currentPassword.length === 0 ||
		updatePassword.length === 0 ||
		currentPassword === updatePassword;

	const onSaveHandler = async (): Promise<void> => {
		logEvent('Account Settings: Name Updated', {
			name: changedName,
		});
		logEvent(
			'Account Settings: Name Updated',
			{
				name: changedName,
			},
			'identify',
		);
		try {
			setIsLoading(true);
			await editUser({
				displayName: changedName,
				userId: user.id,
			});

			notifications.success({
				message: t('success', {
					ns: 'common',
				}),
			});
			updateUser({
				...user,
				displayName: changedName,
			});
			setIsLoading(false);
			hideUpdateNameModal();
		} catch (error) {
			notifications.error({
				message: (error as APIError).getErrorCode(),
				description: (error as APIError).getErrorMessage(),
			});
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
						<MailIcon size={16} /> {user.email}
					</div>

					<div className="user-role">
						<UserIcon size={16} /> {user.role.toLowerCase()}
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
						disabled={isLoading}
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
						onChange={(e): void => setChangedName(e.target.value)}
					/>
				</div>
			</Modal>

			<Modal
				className="reset-password-modal"
				title={<span className="title">Reset password</span>}
				open={isResetPasswordModalOpen}
				closable
				onCancel={hideResetPasswordModal}
				footer={[
					<Button
						key="submit"
						className={`periscope-btn ${
							isResetPasswordDisabled ? 'secondary' : 'primary'
						}`}
						icon={<Check size={16} />}
						onClick={onChangePasswordClickHandler}
						disabled={isLoading || isResetPasswordDisabled}
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
						/>
					</div>
				</div>
			</Modal>
		</div>
	);
}

export default UserInfo;
