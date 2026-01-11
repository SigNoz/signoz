import './Login.styles.scss';

import AuthPageContainer from 'components/AuthPageContainer';
import LoginContainer from 'container/Login';

function Login(): JSX.Element {
	return (
		<AuthPageContainer>
			<div className="auth-form-card">
				<LoginContainer />
			</div>
		</AuthPageContainer>
	);
}

export default Login;
