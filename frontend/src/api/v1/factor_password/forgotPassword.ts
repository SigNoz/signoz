import axios from 'api';

interface ForgotPasswordPayload {
	orgId: string;
	email: string;
	frontendBaseURL: string;
}

const forgotPassword = async (
	payload: ForgotPasswordPayload,
): Promise<void> => {
	await axios.post('/forgotPassword', payload);
};

export default forgotPassword;
