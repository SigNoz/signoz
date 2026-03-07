export type PayloadProps = {
	data: Channels[];
	status: string;
};

export interface Channels {
	created_at: string;
	data: string;
	id: string;
	name: string;
	type: string;
	updated_at: string;
}
