import { Button, Card, Space, Typography } from 'antd';
import changeMyPassword from 'api/v1/factor_password/changeMyPassword';
import { useNotifications } from 'hooks/useNotifications';
import { Save } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import APIError from 'types/api/error';

import { Password } from '../styles';

function PasswordContainer(): JSX.Element {
	const [currentPassword, setCurrentPassword] = useState<string>('');
	const [updatePassword, setUpdatePassword] = useState<string>('');
	const { t } = useTranslation(['routes', 'settings', 'common']);
	const { user } = useAppContext();
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const defaultPlaceHolder = '*************';

	const { notifications } = useNotifications();

	if (!user) {
		return <div />;
	}

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
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			notifications.error({
				message: (error as APIError).error.error.code,
				description: (error as APIError).error.error.message,
			});
		}
	};

	const isDisabled =
		isLoading ||
		currentPassword.length === 0 ||
		updatePassword.length === 0 ||
		currentPassword === updatePassword;

	return (
		<Card className="reset-password-card">
			<Space direction="vertical" size="small">
				<Typography.Title
					level={4}
					style={{ marginTop: 0 }}
					data-testid="change-password-header"
				>
					{t('change_password', {
						ns: 'settings',
					})}
				</Typography.Title>
				<Space direction="vertical">
					<Typography data-testid="current-password-label">
						{t('current_password', {
							ns: 'settings',
						})}
					</Typography>
					<Password
						data-testid="current-password-textbox"
						disabled={isLoading}
						placeholder={defaultPlaceHolder}
						onChange={(event): void => {
							setCurrentPassword(event.target.value);
						}}
						value={currentPassword}
					/>
				</Space>
				<Space direction="vertical">
					<Typography data-testid="new-password-label">
						{t('new_password', {
							ns: 'settings',
						})}
					</Typography>
					<Password
						data-testid="new-password-textbox"
						disabled={isLoading}
						placeholder={defaultPlaceHolder}
						onChange={(event): void => {
							const updatedValue = event.target.value;
							setUpdatePassword(updatedValue);
						}}
						value={updatePassword}
					/>
				</Space>
				<Button
					disabled={isDisabled}
					loading={isLoading}
					onClick={onChangePasswordClickHandler}
					type="primary"
					data-testid="update-password-button"
				>
					<Save
						size={12}
						style={{ marginRight: '8px' }}
						data-testid="update-password-icon"
					/>{' '}
					{t('change_password', {
						ns: 'settings',
					})}
				</Button>
			</Space>
		</Card>
	);
}

export default PasswordContainer;
