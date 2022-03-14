import {
	Button,
	Card,
	Input,
	notification,
	Space,
	Switch,
	Typography,
} from 'antd';
import setLocalStorageKey from 'api/browser/localstorage/set';
import signup from 'api/user/signup';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useEffect, useState } from 'react';
import AppActions from 'types/actions';
const { Title } = Typography;
import setPreference from 'api/user/setPreference';
import { IS_LOGGED_IN } from 'constants/auth';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { PayloadProps } from 'types/api/user/getUserPreference';

import {
	ButtonContainer,
	Container,
	FormWrapper,
	Label,
	LeftContainer,
	Logo,
	MarginTop,
} from './styles';

const Signup = ({ version, userpref }: SignupProps): JSX.Element => {
	const [loading, setLoading] = useState(false);

	const [firstName, setFirstName] = useState<string>('');
	const [email, setEmail] = useState<string>('');
	const [organizationName, setOrganisationName] = useState<string>('');
	const [hasOptedUpdates, setHasOptedUpdates] = useState<boolean>(
		userpref.hasOptedUpdates,
	);
	const [isAnonymous, setisAnonymous] = useState<boolean>(userpref.isAnonymous);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	useEffect(() => {
		setisAnonymous(userpref.isAnonymous);
		setHasOptedUpdates(userpref.hasOptedUpdates);
	}, []);

	const setState = (
		value: string,
		setFunction: React.Dispatch<React.SetStateAction<string>>,
	): void => {
		setFunction(value);
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		(async (): Promise<void> => {
			try {
				e.preventDefault();
				setLoading(true);

				const userPrefernceResponse = await setPreference({
					isAnonymous,
					hasOptedUpdates,
				});

				if (userPrefernceResponse.statusCode === 200) {
					const response = await signup({
						email: email,
						name: firstName,
						organizationName,
					});

					if (response.statusCode === 200) {
						setLocalStorageKey(IS_LOGGED_IN, 'yes');
						dispatch({
							type: 'LOGGED_IN',
						});

						history.push(ROUTES.APPLICATION);
					} else {
						setLoading(false);

						notification.error({
							message: 'Something went wrong',
						});
					}
				} else {
					setLoading(false);

					notification.error({
						message: 'Something went wrong',
					});
				}
			} catch (error) {
				notification.error({
					message: 'Something went wrong',
				});
				setLoading(false);
			}
		})();
	};

	console.log(userpref);

	const onSwitchHandler = (
		value: boolean,
		setFunction: React.Dispatch<React.SetStateAction<boolean>>,
	): void => {
		setFunction(value);
	};

	return (
		<Container>
			<LeftContainer direction="vertical">
				<Space align="center">
					<Logo src={'signoz-signup.svg'} alt="logo" />
					<Title style={{ fontSize: '46px', margin: 0 }}>SigNoz</Title>
				</Space>
				<Typography>
					Monitor your applications. Find what is causing issues.
				</Typography>
				<Card
					style={{ width: 'max-content' }}
					bodyStyle={{ padding: '1px 8px', width: '100%' }}
				>
					SigNoz {version}
				</Card>
			</LeftContainer>

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

					<MarginTop marginTop={'2.4375rem'}>
						<Space>
							<Switch
								onChange={(value) => onSwitchHandler(value, setHasOptedUpdates)}
								checked={hasOptedUpdates}
							/>
							<Typography>Keep me updated on new SigNoz features</Typography>
						</Space>
					</MarginTop>

					<MarginTop marginTop={'0.5rem'}>
						<Space>
							<Switch
								onChange={(value) => onSwitchHandler(value, setisAnonymous)}
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
							disabled={loading || !email || !organizationName || !firstName}
						>
							Get Started
						</Button>
					</ButtonContainer>
				</form>
			</FormWrapper>
		</Container>
	);
};

interface SignupProps {
	version: string;
	userpref: PayloadProps;
}

export default Signup;
