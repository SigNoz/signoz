export interface Alerts {
	labels: AlertsLabel;
	annotations: {};
	state: string;
	name: string;
	id: number;
}

interface AlertsLabel {
	[key: string]: string;
}

export type PayloadProps = Alerts[];
