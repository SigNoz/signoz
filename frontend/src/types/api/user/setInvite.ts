import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface Props {
	name: User['name'];
	email: User['email'];
	role: ROLES;
}

export interface PayloadProps {
	data: string;
}
