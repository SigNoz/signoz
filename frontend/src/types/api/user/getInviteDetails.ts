import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface Props {
	inviteId: string;
}

export interface PayloadProps {
	createdAt: number;
	email: User['email'];
	name: User['name'];
	role: ROLES;
	token: string;
}
