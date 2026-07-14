import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AuthPageContainer from 'components/AuthPageContainer';
import ROUTES from 'constants/routes';
import ForgotPasswordContainer, {
	ForgotPasswordRouteState,
} from 'container/ForgotPassword';
import history from 'lib/history';

import '../Login/Login.styles.scss';

function ForgotPassword(): JSX.Element | null {
	const location = useLocation<ForgotPasswordRouteState | undefined>();
	const routeState = location.state;

	useEffect(() => {
		if (!routeState?.email) {
			history.push(ROUTES.LOGIN);
		}
	}, [routeState]);

	if (!routeState?.email) {
		return null;
	}

	return (
		<AuthPageContainer>
			<div className="auth-form-card">
				<ForgotPasswordContainer
					email={routeState.email}
					orgId={routeState.orgId}
					orgs={routeState.orgs}
				/>
			</div>
		</AuthPageContainer>
	);
}

export default ForgotPassword;
