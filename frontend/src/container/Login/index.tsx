import { Button, Input, notification, Space, Typography } from 'antd';
import loginApi from 'api/user/login';
import afterLogin from 'AppRoutes/utils';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useState } from 'react';

import { FormContainer, FormWrapper, Label, ParentContainer } from './styles';

const { Title } = Typography;

function Login(): JSX.Element {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [email, setEmail] = useState<string>('');
	const [password, setPassword] = useState<string>('');

	const onChangeHandler = (
		setFunc: React.Dispatch<React.SetStateAction<string>>,
		value: string,
	): void => {
		setFunc(value);
	};

	const onSubmitHandler: React.FormEventHandler<HTMLFormElement> = async (
		event,
	) => {
		try {
			event.preventDefault();
			event.persist();
			setIsLoading(true);

			const response = await loginApi({
				email,
				password,
			});
			if (response.statusCode === 200) {
				await afterLogin(
					response.payload.userId,
					response.payload.accessJwt,
					response.payload.refreshJwt,
				);
				history.push(ROUTES.APPLICATION);
			} else {
				notification.error({
					message: response.error || 'Something went wrong',
				});
			}
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);
			notification.error({
				message: 'Something went wrong',
			});
		}
	};

	return (
		<FormWrapper>
			<FormContainer onSubmit={onSubmitHandler}>
				<Title level={4}>Login to SigNoz</Title>
				<ParentContainer>
					<Label htmlFor="signupEmail">Email</Label>
					<Input
						placeholder="mike@netflix.com"
						type="email"
						autoFocus
						required
						id="loginEmail"
						onChange={(event): void => onChangeHandler(setEmail, event.target.value)}
						value={email}
						disabled={isLoading}
					/>
				</ParentContainer>
				<ParentContainer>
					<Label htmlFor="Password">Password</Label>
					<Input.Password
						required
						id="currentPassword"
						onChange={(event): void =>
							onChangeHandler(setPassword, event.target.value)
						}
						disabled={isLoading}
						value={password}
					/>
				</ParentContainer>
				<Space
					style={{ marginTop: '1.3125rem' }}
					align="start"
					direction="vertical"
					size={20}
				>
					<Button
						disabled={isLoading}
						loading={isLoading}
						type="primary"
						htmlType="submit"
						data-attr="signup"
					>
						Login
					</Button>
					<Typography.Link
						onClick={(): void => {
							history.push(ROUTES.SIGN_UP);
						}}
						style={{ fontWeight: 700 }}
					>
						Create an account
					</Typography.Link>

					<Typography.Paragraph italic style={{ color: '#ACACAC' }}>
						If you have forgotten you password, ask your admin to reset password and
						send you a new invite link
					</Typography.Paragraph>
				</Space>
			</FormContainer>
		</FormWrapper>
	);
}

export default Login;
