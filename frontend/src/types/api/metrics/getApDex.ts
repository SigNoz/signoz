export interface ApDexPayloadAndSettingsProps {
	servicename: string;
	threshold: number;
	excludeStatusCode: string;
}

export interface SetApDexPayloadProps {
	data: string;
}

export interface PayloadProps {
	data: ApDexPayloadAndSettingsProps[];
	status: string;
}
