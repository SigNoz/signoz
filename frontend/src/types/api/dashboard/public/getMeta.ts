export interface PublicDashboardMetaProps {
	timeRangeEnabled: boolean;
	defaultTimeRange: string;
    publicPath: string;
}

export type GetPublicDashboardMetaProps = {
	id: string;
};

export interface PayloadProps {
	data: PublicDashboardMetaProps;
	status: string;
}
