import { Button, Input, notification, Space, Switch, Typography } from 'antd';
// import setLocalStorageKey from 'api/browser/localstorage/set';
import setPreference from 'api/user/setPreference';
import signupApi from 'api/user/signup';
import WelcomeLeftContainer from 'components/WelcomeLeftContainer';
// import { IS_LOGGED_IN } from 'constants/auth';
// import ROUTES from 'constants/routes';
// import history from 'lib/history';
import React, { useEffect, useState } from 'react';
// import { useDispatch } from 'react-redux';
// import { Dispatch } from 'redux';
// import AppActions from 'types/actions';
import { PayloadProps } from 'types/api/user/getUserPreference';

import { ButtonContainer, FormWrapper, Label, MarginTop } from './styles';

const { Title } = Typography;

function Signup({ version, userpref }: SignupProps): JSX.Element {
	const [loading, setLoading] = useState(false);

	const [firstName, setFirstName] = useState<string>('');
	const [email, setEmail] = useState<string>('');
	const [organizationName, setOrganisationName] = useState<string>('');
	const [hasOptedUpdates, setHasOptedUpdates] = useState<boolean>(
		userpref.hasOptedUpdates,
	);
	const [isAnonymous, setisAnonymous] = useState<boolean>(userpref.isAnonymous);
	const [password, setPassword] = useState<string>('');
	const [confirmPassword, setConfirmPassword] = useState<string>('');
	const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(
		false,
	);

	// const dispatch = useDispatch<Dispatch<AppActions>>();

	useEffect(() => {
		setisAnonymous(userpref.isAnonymous);
		setHasOptedUpdates(userpref.hasOptedUpdates);
	}, [userpref]);

	const setState = (
		value: string,
		setFunction: React.Dispatch<React.SetStateAction<string>>,
	): void => {
		setFunction(value);
	};

	const defaultError = 'Something went wrong';

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		(async (): Promise<void> => {
			try {
				e.preventDefault();
				setLoading(true);

				const userPreferenceResponse = await setPreference({
					isAnonymous,
					hasOptedUpdates,
				});

				if (userPreferenceResponse.statusCode === 200) {
					const response = await signupApi({
						email,
						name: firstName,
						orgName: organizationName,
						password,
					});

					console.log(response);

					// if (response.statusCode === 200) {
					// 	setLocalStorageKey(IS_LOGGED_IN, 'yes');
					// 	dispatch({
					// 		type: 'LOGGED_IN',
					// 	});

					// 	history.push(ROUTES.APPLICATION);
					// } else {
					// 	setLoading(false);

					// 	notification.error({
					// 		message: defaultError,
					// 	});
					// }
				} else {
					setLoading(false);

					notification.error({
						message: defaultError,
					});
				}
			} catch (error) {
				notification.error({
					message: defaultError,
				});
				setLoading(false);
			}
		})();
	};

	const onSwitchHandler = (
		value: boolean,
		setFunction: React.Dispatch<React.SetStateAction<boolean>>,
	): void => {
		setFunction(value);
	};

	return (
		<WelcomeLeftContainer version={version}>
			<FormWrapper>
				<form onSubmit={handleSubmit}>
					<Title level={4}>Create your account</Title>
					<div>
						<Label htmlFor="signupEmail">Email</Label>
						<Input
							placeholder="mike@netflix.com"
							type="email"
							autoFocus
							value={email}
							onChange={(e): void => {
								setState(e.target.value, setEmail);
							}}
							required
							id="signupEmail"
						/>
					</div>

					<div>
						<Label htmlFor="signupFirstName">First Name</Label>
						<Input
							placeholder="Mike"
							value={firstName}
							onChange={(e): void => {
								setState(e.target.value, setFirstName);
							}}
							required
							id="signupFirstName"
						/>
					</div>
					<div>
						<Label htmlFor="organizationName">Organization Name</Label>
						<Input
							placeholder="Netflix"
							value={organizationName}
							onChange={(e): void => {
								setState(e.target.value, setOrganisationName);
							}}
							required
							id="organizationName"
						/>
					</div>
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

					<MarginTop marginTop="2.4375rem">
						<Space>
							<Switch
								onChange={(value): void => onSwitchHandler(value, setHasOptedUpdates)}
								checked={hasOptedUpdates}
							/>
							<Typography>Keep me updated on new SigNoz features</Typography>
						</Space>
					</MarginTop>

					<MarginTop marginTop="0.5rem">
						<Space>
							<Switch
								onChange={(value): void => onSwitchHandler(value, setisAnonymous)}
								checked={isAnonymous}
							/>
							<Typography>
								Anonymise my usage date. We collect data to measure product usage
							</Typography>
						</Space>
					</MarginTop>

					<ButtonContainer>
						<Button
							type="primary"
							htmlType="submit"
							data-attr="signup"
							loading={loading}
							disabled={
								loading ||
								!email ||
								!organizationName ||
								!firstName ||
								!password ||
								!confirmPassword ||
								confirmPasswordError
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

interface SignupProps {
	version: string;
	userpref: PayloadProps;
}

export default Signup;
