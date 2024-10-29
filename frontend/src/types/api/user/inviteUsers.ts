import { User } from 'types/reducer/app';

import { ErrorResponse } from '..';

export interface UserProps {
	name: User['name'];
	email: User['email'];
	role: string;
	frontendBaseUrl: string;
}

export interface UsersProps {
	users: UserProps[];
}

export interface PayloadProps {
	data: string;
}

export interface FailedInvite {
	email: string;
	error: string;
}

export interface SuccessfulInvite {
	email: string;
	invite_link: string;
	status: string;
}

export interface InviteUsersResponse extends ErrorResponse {
	status: string;
	summary: {
		total_invites: number;
		successful_invites: number;
		failed_invites: number;
	};
	successful_invites: SuccessfulInvite[];
	failed_invites: FailedInvite[];
}
