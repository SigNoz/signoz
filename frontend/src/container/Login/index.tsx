import { Button, Input, notification, Typography } from 'antd';
import setLocalStorage from 'api/browser/localstorage/set';
import loginApi from 'api/user/login';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import {
	LOGGED_IN,
	UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN,
} from 'types/actions/app';

import {
	ButtonContainer,
	FormContainer,
	FormWrapper,
	Label,
	ParentContainer,
} from './styles';

const { Title } = Typography;

function Login(): JSX.Element {
	const dispatch = useDispatch<Dispatch<AppActions>>();
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
				notification.success({
					message: 'Successfully Login',
				});
				dispatch({
					type: UPDATE_USER_ACCESS_REFRESH_ACCESS_TOKEN,
					payload: {
						...response.payload,
					},
				});
				dispatch({
					type: LOGGED_IN,
					payload: {
						isLoggedIn: true,
					},
				});

				// setLocalStorage(LOCALSTORAGE.IS_LOGGED_IN, 'true');
				setLocalStorage(LOCALSTORAGE.AUTH_TOKEN, response.payload.accessJwt);
				setLocalStorage(
					LOCALSTORAGE.REFRESH_AUTH_TOKEN,
					response.payload.refreshJwt,
				);
				setLocalStorage(LOCALSTORAGE.IS_LOGGED_IN, 'true');
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
