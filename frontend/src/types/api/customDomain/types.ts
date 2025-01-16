export interface HostsProps {
	name: string;
	is_default: boolean;
}

export interface RegionProps {
	id: string;
	name: string;
	category: string;
	dns: string;
	created_at: string;
	updated_at: string;
}

export interface ClusterProps {
	id: string;
	name: string;
	cloud_account_id: string;
	cloud_region: string;
	address: string;
	region: RegionProps;
}

export interface DeploymentData {
	id: string;
	name: string;
	email: string;
	state: string;
	tier: string;
	user: string;
	password: string;
	created_at: string;
	updated_at: string;
	cluster_id: string;
	hosts: HostsProps[];
	cluster: ClusterProps;
}

export interface DeploymentsDataProps {
	status: string;
	data: DeploymentData;
}

export type PayloadProps = {
	status: string;
	data: string;
};

export interface UpdateCustomDomainProps {
	data: {
		name: string;
	};
}
