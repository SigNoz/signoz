export interface OrganizationResponse {
	id: string;
	createdAt: string;
	updatedAt: string;
	displayName: string;
	name: string;
	alias: string;
}

export interface PayloadProps {
	data: OrganizationResponse;
	status: string;
}
