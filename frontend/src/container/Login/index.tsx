import { Button, Input, notification, Typography } from 'antd';
import loginApi from 'api/user/login';
import afterLogin from 'AppRoutes/utils';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useState } from 'react';

import {
	ButtonContainer,
	FormContainer,
	FormWrapper,
	Label,
	ParentContainer,
} from './styles';

const { Title } = Typography;

function Login(): JSX.Element {
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
		} catch (error) {
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
						id="signupEmail"
						onChange={(event): void => onChangeHandler(setEmail, event.target.value)}
						value={email}
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
						value={password}
					/>
				</ParentContainer>
				<ButtonContainer>
					<Button type="primary" htmlType="submit" data-attr="signup">
						Get Started
					</Button>
				</ButtonContainer>
			</FormContainer>
		</FormWrapper>
	);
}

export default Login;
