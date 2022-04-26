import { Button, notification, Space, Typography } from 'antd';
import changeMyPassword from 'api/user/changeMyPassword';
import React, { useState } from 'react';
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

	const defaultPlaceHolder = t('input_password', {
		ns: 'settings',
	});

	if (!user) {
		return <div />;
	}

	const onChangePasswordClickHandler = async (): Promise<void> => {
		try {
			setIsLoading(true);
			const { statusCode, error } = await changeMyPassword({
				newPassword: updatePassword,
				oldPassword: currentPassword,
				userId: user.userId,
			});

			if (statusCode === 200) {
				notification.success({
					message: t('success', {
						ns: 'common',
					}),
				});
			} else {
				notification.error({
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

			notification.error({
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
						setUpdatePassword(event.target.value);
					}}
					value={updatePassword}
				/>
			</Space>
			<Button
				disabled={isLoading}
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
