import { Dashboard } from "../getAll";
import { PublicDashboardMetaProps } from "./getMeta";

export interface PublicDashboardDataProps {
	dashboard: Dashboard;
	publicDashboard: PublicDashboardMetaProps;
}

export type GetPublicDashboardDataProps = {
	id: string;
};

export interface PayloadProps {
	data: PublicDashboardDataProps;
	status: string;
}
