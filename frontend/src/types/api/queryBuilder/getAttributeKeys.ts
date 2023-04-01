import { DataSource } from 'types/common/queryBuilder';

export interface IGetAttributeKeysPayload {
	aggregateOperator: string;
	dataSource: DataSource;
	searchText: string;
	aggregateAttribute: string;
}
