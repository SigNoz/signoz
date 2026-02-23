import { RoletypesRoleDTO } from 'api/generated/services/sigNoz.schemas';

const orgId = '019ba2bb-2fa1-7b24-8159-cfca08617ef9';

export const managedRoles: RoletypesRoleDTO[] = [
	{
		id: '019c24aa-2248-756f-9833-984f1ab63819',
		createdAt: new Date('2026-02-03T18:00:55.624356Z'),
		updatedAt: new Date('2026-02-03T18:00:55.624356Z'),
		name: 'signoz-admin',
		description:
			'Role assigned to users who have full administrative access to SigNoz resources.',
		type: 'managed',
		orgId,
	},
	{
		id: '019c24aa-2248-757c-9faf-7b1e899751e0',
		createdAt: new Date('2026-02-03T18:00:55.624359Z'),
		updatedAt: new Date('2026-02-03T18:00:55.624359Z'),
		name: 'signoz-editor',
		description:
			'Role assigned to users who can create, edit, and manage SigNoz resources but do not have full administrative privileges.',
		type: 'managed',
		orgId,
	},
	{
		id: '019c24aa-2248-7585-a129-4188b3473c27',
		createdAt: new Date('2026-02-03T18:00:55.624362Z'),
		updatedAt: new Date('2026-02-03T18:00:55.624362Z'),
		name: 'signoz-viewer',
		description:
			'Role assigned to users who have read-only access to SigNoz resources.',
		type: 'managed',
		orgId,
	},
];

export const customRoles: RoletypesRoleDTO[] = [
	{
		id: '019c24aa-3333-0001-aaaa-111111111111',
		createdAt: new Date('2026-02-10T10:30:00.000Z'),
		updatedAt: new Date('2026-02-12T14:20:00.000Z'),
		name: 'billing-manager',
		description: 'Custom role for managing billing and invoices.',
		type: 'custom',
		orgId,
	},
	{
		id: '019c24aa-3333-0002-bbbb-222222222222',
		createdAt: new Date('2026-02-11T09:00:00.000Z'),
		updatedAt: new Date('2026-02-13T11:45:00.000Z'),
		name: 'dashboard-creator',
		description: 'Custom role allowing users to create and manage dashboards.',
		type: 'custom',
		orgId,
	},
];

export const allRoles: RoletypesRoleDTO[] = [...managedRoles, ...customRoles];

export const listRolesSuccessResponse = {
	status: 'success',
	data: allRoles,
};
