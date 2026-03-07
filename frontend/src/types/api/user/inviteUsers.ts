import { User } from 'types/reducer/app';

export interface UserProps {
	name: User['displayName'];
	email: User['email'];
	role: string;
	frontendBaseUrl: string;
}

export interface UsersProps {
	invites: UserProps[];
}
