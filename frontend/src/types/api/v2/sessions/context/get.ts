import { ErrorV2 } from 'types/api';

export interface Props {
	email: string;
	ref: string;
}

interface PasswordAuthN {
	provider: string;
}

interface CallbackAuthN {
	provider: string;
	url: string;
}

interface AuthNSupport {
	password: PasswordAuthN[];
	callback: CallbackAuthN[];
}

export interface OrgSessionContext {
	id: string;
	name: string;
	authNSupport: AuthNSupport;
	warning?: ErrorV2;
}

export interface SessionsContext {
	exists: boolean;
	orgs: OrgSessionContext[];
}
