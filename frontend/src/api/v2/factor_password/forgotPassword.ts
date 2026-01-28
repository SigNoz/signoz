import { ApiV2Instance } from 'api';

interface ForgotPasswordPayload {
	orgId: string;
	email: string;
	frontendBaseURL: string;
}

const forgotPassword = async (
	payload: ForgotPasswordPayload,
): Promise<void> => {
	await ApiV2Instance.post('/factor_password/forgot', payload);
};

export default forgotPassword;
