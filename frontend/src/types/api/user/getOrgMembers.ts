import { ROLES } from 'types/roles';

import { Organization } from './getOrganization';

export interface Props {
	orgId: Organization['id'];
}

interface OrgMembers {
	createdAt: number;
	email: string;
	name: string;
	role: ROLES;
	token: string;
	id: string;
}

export type PayloadProps = OrgMembers[];
