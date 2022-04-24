import { Button, Input, Typography } from 'antd';
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

	return (
		<FormWrapper>
			<FormContainer>
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
