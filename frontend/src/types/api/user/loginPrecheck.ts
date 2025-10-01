import { UserResponse } from './getUser';

export interface PayloadProps {
	data: UserResponse;
	status: string;
}

export interface Signup {
	sso: boolean;
	ssoUrl?: string;
	canSelfRegister?: boolean;
	isUser: boolean;
}

export interface Props {
	email: string;
	path?: string;
}
