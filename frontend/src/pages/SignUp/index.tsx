import { Button, Input, notification, Typography } from 'antd';
import signup from 'api/user/signup';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { UserLoggedIn } from 'store/actions';
import AppActions from 'types/actions';

import {
	ButtonContainer,
	Container,
	FormWrapper,
	LogoImageContainer,
	Title,
} from './styles';

const Signup = ({ loggedIn }: SignupProps): JSX.Element => {
	const [notificationsInstance, Element] = notification.useNotification();

	const [state, setState] = useState({ submitted: false });
	const [formState, setFormState] = useState({
		firstName: { value: '' },
		companyName: { value: '' },
		email: { value: '' },
		password: { value: '', valid: true },
		emailOptIn: { value: true },
	});

	const updateForm = (
		name: string,
		target: EventTarget & HTMLInputElement,
	): void => {
		if (name === 'firstName') {
			setFormState({
				...formState,
				firstName: { ...formState.firstName, value: target.value },
			});
		} else if (name === 'email') {
			setFormState({
				...formState,
				email: { ...formState.email, value: target.value },
			});
		}
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		(async (): Promise<void> => {
			try {
				e.preventDefault();
				setState((state) => ({ ...state, submitted: true }));
				const payload = {
					first_name: formState.firstName,
					email: formState.email,
				};

				const response = await signup({
					email: payload.email.value,
					name: payload.first_name.value,
				});

				if (response.statusCode === 200) {
					loggedIn();
					history.push(ROUTES.APPLICATION);
				} else {
					notificationsInstance.error({
						message: 'Something went wrong',
					});
				}
			} catch (error) {
				notificationsInstance.error({
					message: 'Something went wrong',
				});
			}
		})();
	};

	return (
		<div>
			{Element}

			<Container direction="vertical">
				<Title>Create your account</Title>
				<Typography>
					Monitor your applications. Find what is causing issues.
				</Typography>
			</Container>

			<FormWrapper>
				<LogoImageContainer src={'signoz.svg'} alt="logo" />

				<form onSubmit={handleSubmit}>
					<div>
						<label htmlFor="signupEmail">Email</label>
						<Input
							placeholder="mike@netflix.com"
							type="email"
							autoFocus
							value={formState.email.value}
							onChange={(e): void => updateForm('email', e.target)}
							required
							id="signupEmail"
						/>
					</div>

					<div>
						<label htmlFor="signupFirstName">First Name</label>
						<Input
							placeholder="Mike"
							value={formState.firstName.value}
							onChange={(e): void => updateForm('firstName', e.target)}
							required
							id="signupFirstName"
						/>
					</div>

					<ButtonContainer>
						<Button
							type="primary"
							htmlType="submit"
							data-attr="signup"
							disabled={state.submitted && !formState.password}
						>
							Get Started
						</Button>
					</ButtonContainer>
				</form>
			</FormWrapper>
		</div>
	);
};

interface DispatchProps {
	loggedIn: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	loggedIn: bindActionCreators(UserLoggedIn, dispatch),
});

type SignupProps = DispatchProps;

export default connect(null, mapDispatchToProps)(Signup);
