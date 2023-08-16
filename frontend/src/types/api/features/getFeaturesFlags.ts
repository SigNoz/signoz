export type FeaturesFlag =
	| 'DurationSort'
	| 'TimestampSort'
	| 'SMART_TRACE_DETAIL'
	| 'CUSTOM_METRICS_FUNCTION'
	| 'QUERY_BUILDER_PANELS'
	| 'QUERY_BUILDER_ALERTS'
	| 'DISABLE_UPSELL'
	| 'SSO';

interface FeatureFlagProps {
	name: FeaturesFlag;
	active: boolean;
	usage: number;
	usage_limit: number;
	route: string;
}

export type PayloadProps = FeatureFlagProps[];
