import ROUTES from 'constants/routes';
import { DataSource } from 'types/common/queryBuilder';

export const DATASOURCE_VS_ROUTES: Record<DataSource, string> = {
	[DataSource.METRICS]: '',
	[DataSource.TRACES]: ROUTES.TRACES_EXPLORER,
	[DataSource.LOGS]: ROUTES.LOGS_EXPLORER,
};
