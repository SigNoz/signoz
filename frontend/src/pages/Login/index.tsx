import './Login.styles.scss';

import LoginContainer from 'container/Login';
import DecorativeImage from 'components/DecorativeImage/DecorativeImage';
import useURLQuery from 'hooks/useUrlQuery';

function Login(): JSX.Element {
	const urlQueryParams = useURLQuery();
	const jwt = urlQueryParams.get('jwt') || '';
	const refreshJwt = urlQueryParams.get('refreshjwt') || '';
	const userId = urlQueryParams.get('usr') || '';
	const ssoerror = urlQueryParams.get('ssoerror') || '';
	const withPassword = urlQueryParams.get('password') || '';

	return (
		<div className="login-page-container">
			<div className="perilin-bg" />
			<div className="login-page-content">
				<div className="brand-container">
					<DecorativeImage src="/Logos/signoz-brand-logo.svg" className="brand-logo" />

					<div className="brand-title">SigNoz</div>
				</div>

				<LoginContainer
					ssoerror={ssoerror}
					jwt={jwt}
					refreshjwt={refreshJwt}
					userId={userId}
					withPassword={withPassword}
				/>
			</div>
		</div>
	);
}

export default Login;
