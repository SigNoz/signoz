import {
	Button,
	Input,
	notification,
	Typography,
	Switch,
	Space,
	Card,
} from 'antd';
import signup from 'api/user/signup';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { UserLoggedIn } from 'store/actions';
import AppActions from 'types/actions';
const { Title } = Typography;

import {
	ButtonContainer,
	Container,
	FormWrapper,
	Label,
	LeftContainer,
	Logo,
	MarginTop,
} from './styles';

const Signup = ({ loggedIn }: SignupProps): JSX.Element => {
	const [notificationsInstance, Element] = notification.useNotification();

	const [loading, setLoading] = useState(false);

	const [firstName, setFirstName] = useState<string>('');
	const [email, setEmail] = useState<string>('');
	const [organizationName, setOrganisationName] = useState<string>('');
	const [keepMeUpdated, setKeepMeUpdated] = useState<boolean>(true);
	const [anonymise, setAnonymise] = useState<boolean>(false);

	const setState = (
		value: string,
		setFunction: React.Dispatch<React.SetStateAction<string>>,
	) => {
		setFunction(value);
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
		(async (): Promise<void> => {
			try {
				e.preventDefault();
				setLoading(true);
				const payload = {
					first_name: firstName,
					email: email,
				};

				const response = await signup({
					email: payload.email,
					name: payload.first_name,
				});

				if (response.statusCode === 200) {
					loggedIn();
					history.push(ROUTES.APPLICATION);
				} else {
					notificationsInstance.error({
						message: 'Something went wrong',
					});
				}
				setLoading(false);
			} catch (error) {
				notificationsInstance.error({
					message: 'Something went wrong',
				});
				setLoading(false);
			}
		})();
	};

	const onSwitchHandler = (
		value: boolean,
		setFunction: React.Dispatch<React.SetStateAction<boolean>>,
	) => {
		setFunction(value);
	};

	return (
		<Container>
			{Element}

			<LeftContainer direction="vertical">
				<Space align="center">
					<Logo src={'signoz.svg'} alt="logo" />
					<Title style={{ fontSize: '46px', margin: 0 }}>SigNoz</Title>
				</Space>
				<Typography>
					Monitor your applications. Find what is causing issues.
				</Typography>
				<Card
					style={{ width: 'max-content' }}
					bodyStyle={{ padding: '1px 8px', width: '100%' }}
				>
					SigNoz v0.5.4
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
								onChange={(value) => onSwitchHandler(value, setKeepMeUpdated)}
								checked={keepMeUpdated}
							/>
							<Typography>Keep me updated on new SigNoz features</Typography>
						</Space>
					</MarginTop>

					<MarginTop marginTop={'0.5rem'}>
						<Space>
							<Switch
								onChange={(value) => onSwitchHandler(value, setAnonymise)}
								checked={anonymise}
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
