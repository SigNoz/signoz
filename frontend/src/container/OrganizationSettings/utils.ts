export interface InviteTeamMembersProps {
	email: string;
	name: string;
	role: string;
	id: string;
	frontendBaseUrl: string;
}

type Role = 'ADMIN' | 'VIEWER' | 'EDITOR';

export interface InviteMemberFormValues {
	members: {
		email: string;
		name: string;
		role: Role;
	}[];
}
