import getUserVersion from 'api/v1/version/get';
import Spinner from 'components/Spinner';
import ResetPasswordContainer from 'container/ResetPassword';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useEffect } from 'react';
import { useQuery } from 'react-query';
import APIError from 'types/api/error';

function ResetPassword(): JSX.Element {
	const { user, isLoggedIn } = useAppContext();
	const { showErrorModal } = useErrorModal();

	const { data, isLoading, error } = useQuery({
		queryFn: getUserVersion,
		queryKey: ['getUserVersion', user?.accessJwt],
		enabled: !isLoggedIn,
	});

	useEffect(() => {
		if (error) {
			showErrorModal(error as APIError);
		}
	}, [error, showErrorModal]);

	if (isLoading) {
		return <Spinner tip="Loading..." />;
	}

	return <ResetPasswordContainer version={data?.data.version || ''} />;
}

export default ResetPassword;
