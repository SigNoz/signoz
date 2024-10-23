import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface UserProps {
	name: User['name'];
	email: User['email'];
	role: ROLES;
	frontendBaseUrl: string;
}

export interface UsersProps {
	users: UserProps[];
}

export interface PayloadProps {
	data: string;
}
