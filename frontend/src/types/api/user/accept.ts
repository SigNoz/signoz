export interface Props {
	token: string;
	password: string;
	displayName?: string;
	sourceUrl?: string;
}

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
