import React, { useState } from 'react';
import { Row, Space, Button, Input } from 'antd';
import api, { apiV1 } from '../../api';
import ROUTES from 'Src/constants/routes';
import { IS_LOGGED_IN } from 'Src/constants/auth';

import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';

type SignUpProps = RouteComponentProps<any>

const Signup = (props: SignUpProps) => {
	const [state, setState] = useState({ submitted: false });
	const [formState, setFormState] = useState({
		firstName: { value: '' },
		companyName: { value: '' },
		email: { value: '' },
		password: { value: '', valid: true },
		emailOptIn: { value: true },
	});

	const updateForm = (name: any, target: any, valueAttr = 'value') => {
		/* Validate password (if applicable) */
		if (name === 'firstName') {
			setFormState({
				...formState,
				firstName: { ...formState.firstName, value: target[valueAttr] },
			});
		} else if (name === 'email') {
			setFormState({
				...formState,
				email: { ...formState.email, value: target[valueAttr] },
			});
		}
	};

	const handleSubmit = (e: any) => {
		e.preventDefault();

		setState({ ...state, submitted: true });

		const payload = {
			first_name: formState.firstName,
			email: formState.email,
		};

		const texttolog = JSON.stringify(payload);

		api.post(apiV1 + '/user?email=' + texttolog).then((res) => {
			console.log(res);
			console.log(res.data);
		});

		localStorage.setItem(IS_LOGGED_IN, 'yes');
		props.history.push(ROUTES.APPLICATION);
	};

	return (
		<div className="signup-form">
			<Space
				direction="vertical"
				className="space-top"
				style={{ width: '100%', paddingLeft: 32 }}
			>
				<h1
					className="title"
					style={{
						marginBottom: 0,
						marginTop: 40,
						display: 'flex',
						alignItems: 'center',
					}}
				>
					{/* <img src={"Signoz-white.svg"} alt="" style={{ height: 60 }} /> */}
					Create your account
				</h1>
				<div className="page-caption">
					Monitor your applications. Find what is causing issues.
				</div>
			</Space>
			<Row style={{ display: 'flex', justifyContent: 'center' }}>
				<div
					style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}
				>
					<img
						src={'signoz.svg'}
						style={{ maxHeight: '100%', maxWidth: 300, marginTop: 64 }}
						alt=""
						className="main-img"
					/>
				</div>
				<div
					style={{
						display: 'flex',
						justifyContent: 'flex-start',
						margin: '0 32px',
						flexDirection: 'column',
						paddingTop: 32,
						maxWidth: '32rem',
					}}
				>
					<form onSubmit={handleSubmit}>
						<div className="input-set">
							<label htmlFor="signupEmail">Email</label>
							<Input
								placeholder="mike@netflix.com"
								type="email"
								value={formState.email.value}
								onChange={(e) => updateForm('email', e.target)}
								required
								// disabled={accountLoading}
								id="signupEmail"
							/>
						</div>

						<div className="input-set">
							<label htmlFor="signupFirstName">First Name</label>
							<Input
								placeholder="Mike"
								autoFocus
								value={formState.firstName.value}
								onChange={(e) => updateForm('firstName', e.target)}
								required
								// disabled={accountLoading}
								id="signupFirstName"
							/>
						</div>

						<div className="text-center space-top" style={{ marginTop: 12 }}>
							<Button
								type="primary"
								htmlType="submit"
								data-attr="signup"
								disabled={state.submitted && !formState.password}
								// loading={accountLoading}
							>
								Get Started
							</Button>
						</div>

						{/* <div style={{ color: '#666666', marginBottom: 60, textAlign: 'center' }} className="space-top">
                        By clicking the button above you agree to our{' '}
                        <a href="https://signoz.io" target="_blank">
                            Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="https://signoz.io" target="_blank">
                            Privacy Policy
                        </a>
                        .
                    </div> */}
					</form>
				</div>
			</Row>
		</div>
	);
};

export default withRouter(Signup);
