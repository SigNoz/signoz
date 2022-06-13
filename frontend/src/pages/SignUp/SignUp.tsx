import { Button, Input, notification, Space, Switch, Typography } from 'antd';
import editOrg from 'api/user/editOrg';
import getInviteDetails from 'api/user/getInviteDetails';
import loginApi from 'api/user/login';
import signUpApi from 'api/user/signup';
import afterLogin from 'AppRoutes/utils';
import WelcomeLeftContainer from 'components/WelcomeLeftContainer';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { SuccessResponse } from 'types/api';
import { PayloadProps } from 'types/api/user/getUser';

import { ButtonContainer, FormWrapper, Label, MarginTop } from './styles';
import { isPasswordNotValidMessage, isPasswordValid } from './utils';

const { Title } = Typography;

function SignUp({ version }: SignUpProps): JSX.Element {
	const [loading, setLoading] = useState(false);

	const [firstName, setFirstName] = useState<string>('');
	const [email, setEmail] = useState<string>('');
	const [organizationName, setOrganizationName] = useState<string>('');
	const [hasOptedUpdates, setHasOptedUpdates] = useState<boolean>(true);
	const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
	const [password, setPassword] = useState<string>('');
	const [confirmPassword, setConfirmPassword] = useState<string>('');
	const [confirmPasswordError, setConfirmPasswordError] = useState<boolean>(
		false,
	);
	const [isPasswordPolicyError, setIsPasswordPolicyError] = useState<boolean>(
		false,
	);
	const { search } = useLocation();
	const params = new URLSearchParams(search);
	const token = params.get('token');
	const [isDetailsDisable, setIsDetailsDisable] = useState<boolean>(false);

	const getInviteDetailsResponse = useQuery({
		queryFn: () =>
			getInviteDetails({
				inviteId: token || '',
			}),
		queryKey: 'getInviteDetails',
		enabled: token !== null,
	});

	useEffect(() => {
		if (
			getInviteDetailsResponse.status === 'success' &&
			getInviteDetailsResponse.data.payload
		) {
			const responseDetails = getInviteDetailsResponse.data.payload;
			setFirstName(responseDetails.name);
			setEmail(responseDetails.email);
			setOrganizationName(responseDetails.organization);
			setIsDetailsDisable(true);
		}
	}, [getInviteDetailsResponse?.data?.payload, getInviteDetailsResponse.status]);

	const setState = (
		value: string,
		setFunction: React.Dispatch<React.SetStateAction<string>>,
	): void => {
		setFunction(value);
	};

	const defaultError = 'Something went wrong';
	const isPreferenceVisible = token === null;

	const commonHandler = async (
		callback: (e: SuccessResponse<PayloadProps>) => Promise<void> | VoidFunction,
	): Promise<void> => {
		try {
			const response = await signUpApi({
				email,
				name: firstName,
				orgName: organizationName,
				password,
				token: params.get('token') || undefined,
			});

			if (response.statusCode === 200) {
				const loginResponse = await loginApi({
					email,
					password,
				});

				if (loginResponse.statusCode === 200) {
					const { payload } = loginResponse;
					const userResponse = await afterLogin(
						payload.userId,
						payload.accessJwt,
						payload.refreshJwt,
					);
					if (userResponse) {
						callback(userResponse);
					}
				} else {
					notification.error({
						message: loginResponse.error || defaultError,
					});
				}
			} else {
				notification.error({
					message: response.error || defaultError,
				});
			}
		} catch (error) {
			notification.error({
				message: defaultError,
			});
		}
	};

	const onAdminAfterLogin = async (
		userResponse: SuccessResponse<PayloadProps>,
	): Promise<void> => {
		const editResponse = await editOrg({
			isAnonymous,
			name: organizationName,
			hasOptedUpdates,
			orgId: userResponse.payload.orgId,
		});
		if (editResponse.statusCode === 200) {
			history.push(ROUTES.APPLICATION);
		} else {
			notification.error({
				message: editResponse.error || defaultError,
			});
		}
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		(async (): Promise<void> => {
			try {
				e.preventDefault();
				setLoading(true);

				if (!isPasswordValid(password)) {
					setIsPasswordPolicyError(true);
					setLoading(false);
					return;
				}

				if (isPreferenceVisible) {
					await commonHandler(onAdminAfterLogin);
				} else {
					await commonHandler(
						async (): Promise<void> => {
							history.push(ROUTES.APPLICATION);
						},
					);
				}

				setLoading(false);
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

	const getIsNameVisible = (): boolean =>
		!(firstName.length === 0 && !isPreferenceVisible);

	const isNameVisible = getIsNameVisible();

	useEffect(() => {
		if (!isPasswordValid(password) && password.length) {
			setIsPasswordPolicyError(true);
		} else {
			setIsPasswordPolicyError(false);
		}

		if (password !== confirmPassword) {
			setConfirmPasswordError(true);
		} else {
			setConfirmPasswordError(false);
		}
	}, [password, confirmPassword]);

	return (
		<WelcomeLeftContainer version={version}>
			<FormWrapper>
				<form onSubmit={handleSubmit}>
					<Title level={4}>Create your account</Title>
					<div>
						<Label htmlFor="signupEmail">Email</Label>
						<Input
							placeholder="name@yourcompany.com"
							type="email"
							autoFocus
							value={email}
							onChange={(e): void => {
								setState(e.target.value, setEmail);
							}}
							required
							id="signupEmail"
							disabled={isDetailsDisable}
						/>
					</div>

					{isNameVisible && (
						<div>
							<Label htmlFor="signupFirstName">First Name</Label>
							<Input
								placeholder="Your Name"
								value={firstName}
								onChange={(e): void => {
									setState(e.target.value, setFirstName);
								}}
								required
								id="signupFirstName"
								disabled={isDetailsDisable}
							/>
						</div>
					)}

					<div>
						<Label htmlFor="organizationName">Organization Name</Label>
						<Input
							placeholder="Your Company"
							value={organizationName}
							onChange={(e): void => {
								setState(e.target.value, setOrganizationName);
							}}
							required
							id="organizationName"
							disabled={isDetailsDisable}
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
						{isPasswordPolicyError && (
							<Typography.Paragraph
								italic
								style={{
									color: '#D89614',
									marginTop: '0.50rem',
								}}
							>
								{isPasswordNotValidMessage}
							</Typography.Paragraph>
						)}
					</div>

					{isPreferenceVisible && (
						<>
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
										onChange={(value): void => onSwitchHandler(value, setIsAnonymous)}
										checked={isAnonymous}
									/>
									<Typography>
										Anonymise my usage date. We collect data to measure product usage
									</Typography>
								</Space>
							</MarginTop>
						</>
					)}

					{isPreferenceVisible && (
						<Typography.Paragraph
							italic
							style={{
								color: '#D89614',
								marginTop: '0.50rem',
							}}
						>
							This will create an admin account. If you are not an admin, please ask
							your admin for an invite link
						</Typography.Paragraph>
					)}

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
								!password ||
								!confirmPassword ||
								confirmPasswordError ||
								isPasswordPolicyError
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

interface SignUpProps {
	version: string;
}

export default SignUp;
