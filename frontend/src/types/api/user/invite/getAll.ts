import { ROLES } from 'types/roles';

export interface PendingInvite {
	id: string;
	createdAt: string;
	email: string;
	name: string;
	orgId: string;
	role: ROLES;
	token: string;
	inviteLink: string;
	updatedAt: string;
}

export type PayloadProps = {
	data: PendingInvite[];
	status: string;
};
