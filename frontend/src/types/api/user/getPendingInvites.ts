import { User } from 'types/reducer/app';
import { ROLES } from 'types/roles';

export interface PendingInvite {
	createdAt: number;
	email: User['email'];
	name: User['displayName'];
	role: ROLES;
	token: string;
}

export type PayloadProps = PendingInvite[];
