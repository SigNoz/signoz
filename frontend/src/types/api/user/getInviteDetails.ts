import { ROLES } from 'types/roles';

export interface Props {
	inviteId: string;
}

export interface InviteResponse {
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
	data: InviteResponse;
	status: string;
};
