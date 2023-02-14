import { Button, Input, Typography } from 'antd';
import resetPasswordApi from 'api/user/resetPassword';
import { Logout } from 'api/utils';
import WelcomeLeftContainer from 'components/WelcomeLeftContainer';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { Label } from 'pages/SignUp/styles';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-use';

import { ButtonContainer, FormWrapper } from './styles';

const { Title } = Typography;

function ResetPassword({ version }: ResetPasswordProps): JSX.Element {
	const [password, setPassword] = useState<string>('');
	const [confirmPassword, setConfirmPassword] = useState<string>('');
	const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(
		false,
	);
	const [loading, setLoading] = useState(false);
	const { t } = useTranslation(['common']);
	const { search } = useLocation();
	const params = new URLSearchParams(search);
	const token = params.get('token');
	const { notifications } = useNotifications();

	useEffect(() => {
		if (!token) {
			Logout();
			history.push(ROUTES.LOGIN);
		}
	}, [token]);

	const setState = (
		value: string,
		setFunction: React.Dispatch<React.SetStateAction<string>>,
	): void => {
		setFunction(value);
	};

	const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
		event,
	): Promise<void> => {
		try {
			setLoading(true);
			event.preventDefault();
			event.persist();

			const response = await resetPasswordApi({
				password,
				token: token || '',
			});

			if (response.statusCode === 200) {
				notifications.success({
					message: t('success', {
						ns: 'common',
					}),
				});
				history.push(ROUTES.LOGIN);
			} else {
				notifications.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}

			setLoading(false);
		} catch (error) {
			setLoading(false);
			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	};

	return (
		<WelcomeLeftContainer version={version}>
			<FormWrapper>
				<form onSubmit={handleSubmit}>
					<Title level={4}>Reset Your Password</Title>

					<div>
						<Label htmlFor="Password">Password</Label>
						<Input.Password
							value={password}
							onChange={(e): void => {
								setState(e.target.value, setPassword);
							}}
							required
							id="currentPassword"
						/>
					</div>
					<div>
						<Label htmlFor="ConfirmPassword">Confirm Password</Label>
						<Input.Password
							value={confirmPassword}
							onChange={(e): void => {
								const updateValue = e.target.value;
								setState(updateValue, setConfirmPassword);
								if (password !== updateValue) {
									setConfirmPasswordError(true);
								} else {
									setConfirmPasswordError(false);
								}
							}}
							required
							id="UpdatePassword"
						/>

						{confirmPasswordError && (
							<Typography.Paragraph
								italic
								style={{
									color: '#D89614',
									marginTop: '0.50rem',
								}}
							>
								Passwords don’t match. Please try again
							</Typography.Paragraph>
						)}
					</div>

					<ButtonContainer>
						<Button
							type="primary"
							htmlType="submit"
							data-attr="signup"
							loading={loading}
							disabled={
								loading ||
								!password ||
								!confirmPassword ||
								confirmPasswordError ||
								token === null
							}
						>
							Get Started
						</Button>
					</ButtonContainer>
				</form>
			</FormWrapper>
		</WelcomeLeftContainer>
	);
}

interface ResetPasswordProps {
	version: string;
}

export default ResetPassword;
