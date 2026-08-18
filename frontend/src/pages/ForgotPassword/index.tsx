import { useEffect } from 'react';
import AuthPageContainer from 'components/AuthPageContainer';
import ROUTES from 'constants/routes';
import ForgotPasswordContainer, {
	ForgotPasswordRouteState,
} from 'container/ForgotPassword';
import { useAppLocation } from 'lib/router/useAppLocation';
import { navigate } from 'lib/router/navigation';

import '../Login/Login.styles.scss';

function ForgotPassword(): JSX.Element | null {
	const location = useAppLocation<ForgotPasswordRouteState | undefined>();
	const routeState = location.state;

	useEffect(() => {
		if (!routeState?.email) {
			navigate(ROUTES.LOGIN);
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
