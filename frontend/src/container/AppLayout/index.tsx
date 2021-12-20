import ROUTES from 'constants/routes';
import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import history from 'lib/history';
import React, { ReactNode, Component } from 'react';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import Feedback from './FeedBack';
import { Content, Footer, Layout } from './styles';
import Error from './Error';

class AppLayout extends React.Component<Props, State> {
	state: State = {
		isSignUpPage: ROUTES.SIGN_UP === location.pathname,
		isError: false,
		error: undefined,
		errorInfo: undefined,
	};

	componentDidMount() {
		if (!this.props.isLoggedIn) {
			this.setState((state) => ({
				...state,
				isSignUpPage: true,
			}));
			history.push(ROUTES.SIGN_UP);
		} else {
			if (this.state.isSignUpPage) {
				this.setState((state) => ({
					...state,
					isSignUpPage: false,
				}));
			}
		}
	}

	getLayout(children: React.ReactNode) {
		const currentYear = new Date().getFullYear();
		const { isSignUpPage } = this.state;

		return (
			<Layout>
				{!isSignUpPage && <SideNav />}
				<Layout>
					<Content>
						{!isSignUpPage && <TopNav />}
						{children}
					</Content>
					<Footer>{`SigNoz Inc. © ${currentYear}`}</Footer>
				</Layout>

				<Feedback />
			</Layout>
		);
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		this.setState((state) => ({
			...state,
			isError: true,
			error,
			errorInfo,
		}));
	}

	render(): React.ReactNode {
		const { isError, error, errorInfo } = this.state;

		if (isError && error && errorInfo) {
			return (
				<Error
					{...{
						error,
						errorInfo,
					}}
				/>
			);
		}

		return <>{this.getLayout(this.props.children)}</>;
	}
}

interface State {
	isSignUpPage: boolean;
	isError: boolean;
	error?: Error;
	errorInfo?: React.ErrorInfo;
}

interface Props {
	children: React.ReactNode;
	isLoggedIn: AppReducer['isLoggedIn'];
}

export default connect((state: AppState) => ({
	isLoggedIn: state.app.isLoggedIn,
}))(AppLayout);
