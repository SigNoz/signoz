import { User } from 'types/reducer/app';

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
