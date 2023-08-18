export interface PayloadProps {
	sso: boolean;
	ssoUrl?: string;
	canSelfRegister?: boolean;
	isUser: boolean;
}

export interface Props {
	email: string;
	path?: string;
}
