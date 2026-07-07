export interface Threshold {
	thresholdValue: number;
	thresholdColor?: string;
	thresholdUnit?: string;
	thresholdLabel?: string;
}

export interface ThresholdsDrawHookOptions {
	scaleKey: string;
	thresholds: Threshold[];
	yAxisUnit?: string;
}
