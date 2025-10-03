import { ROLES } from 'types/roles';

export interface SignupResponse {
	createdAt: number;
	email: string;
	id: string;
	displayName: string;
	orgId: string;
	role: ROLES;
}
