import { Button, Space, Typography } from 'antd';
import changeMyPassword from 'api/user/changeMyPassword';
import { useNotifications } from 'hooks/useNotifications';
import { isPasswordNotValidMessage, isPasswordValid } from 'pages/SignUp/utils';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { Password } from '../styles';

function PasswordContainer(): JSX.Element {
	const [currentPassword, setCurrentPassword] = useState<string>('');
	const [updatePassword, setUpdatePassword] = useState<string>('');
	const { t } = useTranslation(['routes', 'settings', 'common']);
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isPasswordPolicyError, setIsPasswordPolicyError] = useState<boolean>(
		false,
	);

	const defaultPlaceHolder = t('input_password', {
		ns: 'settings',
	});

	const { notifications } = useNotifications();

	useEffect(() => {
		if (currentPassword && !isPasswordValid(currentPassword)) {
			setIsPasswordPolicyError(true);
		} else {
			setIsPasswordPolicyError(false);
		}
	}, [currentPassword]);

	if (!user) {
		return <div />;
	}

	const onChangePasswordClickHandler = async (): Promise<void> => {
		try {
			setIsLoading(true);

			if (!isPasswordValid(currentPassword)) {
				setIsPasswordPolicyError(true);
				setIsLoading(false);
				return;
			}

			const { statusCode, error } = await changeMyPassword({
				newPassword: updatePassword,
				oldPassword: currentPassword,
				userId: user.userId,
			});

			if (statusCode === 200) {
				notifications.success({
					message: t('success', {
						ns: 'common',
					}),
				});
			} else {
				notifications.error({
					message:
						error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);

			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	};

	return (
		<Space direction="vertical" size="large">
			<Typography.Title level={3}>
				{t('change_password', {
					ns: 'settings',
				})}
			</Typography.Title>
			<Space direction="vertical">
				<Typography>
					{t('current_password', {
						ns: 'settings',
					})}
				</Typography>
				<Password
					disabled={isLoading}
					placeholder={defaultPlaceHolder}
					onChange={(event): void => {
						setCurrentPassword(event.target.value);
					}}
					value={currentPassword}
				/>
			</Space>
			<Space direction="vertical">
				<Typography>
					{t('new_password', {
						ns: 'settings',
					})}
				</Typography>
				<Password
					disabled={isLoading}
					placeholder={defaultPlaceHolder}
					onChange={(event): void => {
						const updatedValue = event.target.value;
						setUpdatePassword(updatedValue);
					}}
					value={updatePassword}
				/>
			</Space>
			<Space>
				{isPasswordPolicyError && (
					<Typography.Paragraph
						style={{
							color: '#D89614',
							marginTop: '0.50rem',
						}}
					>
						{isPasswordNotValidMessage}
					</Typography.Paragraph>
				)}
			</Space>
			<Button
				disabled={
					isLoading ||
					currentPassword.length === 0 ||
					updatePassword.length === 0 ||
					isPasswordPolicyError ||
					currentPassword !== updatePassword
				}
				loading={isLoading}
				onClick={onChangePasswordClickHandler}
				type="primary"
			>
				{t('change_password', {
					ns: 'settings',
				})}
			</Button>
		</Space>
	);
}

export default PasswordContainer;
