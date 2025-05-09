export interface LoginPrecheckResponse {
	sso: boolean;
	ssoUrl?: string;
	canSelfRegister?: boolean;
	isUser: boolean;
}

export interface PayloadProps {
	data: LoginPrecheckResponse;
	status: string;
}

export interface Props {
	email: string;
	path?: string;
}
