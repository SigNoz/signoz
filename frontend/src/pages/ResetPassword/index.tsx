import { Typography } from 'antd';
import getUserVersion from 'api/user/getVersion';
import Spinner from 'components/Spinner';
import ResetPasswordContainer from 'container/ResetPassword';
import { useAppContext } from 'providers/App/App';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';

function ResetPassword(): JSX.Element {
	const { t } = useTranslation('common');
	const { user, isLoggedIn } = useAppContext();

	const [versionResponse] = useQueries([
		{
			queryFn: getUserVersion,
			queryKey: ['getUserVersion', user?.accessJwt],
			enabled: !isLoggedIn,
		},
	]);

	if (
		versionResponse.status === 'error' ||
		(versionResponse.status === 'success' &&
			versionResponse.data?.statusCode !== 200)
	) {
		return (
			<Typography>
				{versionResponse.data?.error || t('something_went_wrong')}
			</Typography>
		);
	}

	if (
		versionResponse.status === 'loading' ||
		!(versionResponse.data && versionResponse.data.payload)
	) {
		return <Spinner tip="Loading..." />;
	}

	const { version } = versionResponse.data.payload;

	return <ResetPasswordContainer version={version} />;
}

export default ResetPassword;
