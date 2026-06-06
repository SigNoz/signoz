import { useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { useLocation } from 'react-use';
import { AxiosError } from 'axios';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import getUserVersion from 'api/v1/version/get';
import { verifyResetPasswordToken } from 'api/generated/services/users';
import { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { Logout } from 'api/utils';
import Spinner from 'components/Spinner';
import ResetPasswordContainer from 'container/ResetPassword';
import TokenError from 'container/ResetPassword/TokenError';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

function ResetPassword(): JSX.Element {
	const { user, isLoggedIn } = useAppContext();
	const { showErrorModal } = useErrorModal();
	const { search } = useLocation();
	const params = new URLSearchParams(search || '');
	const token = params.get('token') || '';

	useEffect(() => {
		if (!token) {
			void Logout();
			history.push(ROUTES.LOGIN);
		}
	}, [token]);

	const {
		data: versionData,
		isLoading: isVersionLoading,
		error: versionError,
	} = useQuery({
		queryFn: getUserVersion,
		queryKey: ['getUserVersion', user?.accessJwt],
		enabled: !isLoggedIn,
	});

	const {
		isLoading: isVerifying,
		isError: isTokenError,
		error: tokenError,
	} = useQuery<
		Awaited<ReturnType<typeof verifyResetPasswordToken>>,
		AxiosError<RenderErrorResponseDTO>
	>({
		queryFn: () => verifyResetPasswordToken({ token }),
		queryKey: ['verifyResetPasswordToken', token],
		enabled: !!token,
		retry: false,
	});

	const tokenApiError = useMemo(
		() => convertToApiError(tokenError),
		[tokenError],
	);

	useEffect(() => {
		if (versionError) {
			showErrorModal(versionError as APIError);
		}
	}, [versionError, showErrorModal]);

	if (!token) {
		return <Spinner tip="Loading..." />;
	}

	if (isVersionLoading || isVerifying) {
		return <Spinner tip="Validating your reset password token..." />;
	}

	if (isTokenError) {
		return <TokenError error={tokenApiError} />;
	}

	return <ResetPasswordContainer version={versionData?.data.version || ''} />;
}

export default ResetPassword;
