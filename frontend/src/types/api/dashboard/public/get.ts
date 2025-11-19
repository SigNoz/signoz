export interface PublicDashboardProps {
	timeRangeEnabled: boolean;
	defaultTimeRange: string;
    publicPath: string;
}

export type GetPublicDashboardProps = {
	id: string;
};

export interface PayloadProps {
	data: PublicDashboardProps;
	status: string;
}
