export interface Alerts {
	labels: AlertsLabel;
	annotations: {
		description: string;
		summary: string;
		[key: string]: string;
	};
	state: string;
	name: string;
	id: number;
	endsAt: string;
	fingerprint: string;
	generatorURL: string;
	receivers: Receivers[];
	startsAt: string;
	status: {
		inhibitedBy: [];
		silencedBy: [];
		state: string;
	};
	updatedAt: string;
}

interface Receivers {
	name: string;
}

interface AlertsLabel {
	[key: string]: string;
}

export type PayloadProps = Alerts[];
