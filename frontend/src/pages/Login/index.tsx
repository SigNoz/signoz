import { Typography } from 'antd';
import getUserVersion from 'api/user/getVersion';
import Spinner from 'components/Spinner';
import WelcomeLeftContainer from 'components/WelcomeLeftContainer';
import LoginContainer from 'container/Login';
import useURLQuery from 'hooks/useUrlQuery';
import { useAppContext } from 'providers/App/App';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';

function Login(): JSX.Element {
	const { isLoggedIn } = useAppContext();
	const { t } = useTranslation();

	const urlQueryParams = useURLQuery();
	const jwt = urlQueryParams.get('jwt') || '';
	const refreshJwt = urlQueryParams.get('refreshjwt') || '';
	const userId = urlQueryParams.get('usr') || '';
	const ssoerror = urlQueryParams.get('ssoerror') || '';
	const withPassword = urlQueryParams.get('password') || '';

	const versionResult = useQuery({
		queryFn: getUserVersion,
		queryKey: ['getUserVersion', jwt],
		enabled: !isLoggedIn,
	});

	if (
		versionResult.status === 'error' ||
		(versionResult.status === 'success' && versionResult?.data.statusCode !== 200)
	) {
		return (
			<Typography>
				{versionResult.data?.error || t('something_went_wrong')}
			</Typography>
		);
	}

	if (
		versionResult.status === 'loading' ||
		!(versionResult.data && versionResult.data.payload)
	) {
		return <Spinner tip="Loading..." />;
	}

	const { version } = versionResult.data.payload;

	return (
		<WelcomeLeftContainer version={version}>
			<LoginContainer
				ssoerror={ssoerror}
				jwt={jwt}
				refreshjwt={refreshJwt}
				userId={userId}
				withPassword={withPassword}
			/>
		</WelcomeLeftContainer>
	);
}

export default Login;
