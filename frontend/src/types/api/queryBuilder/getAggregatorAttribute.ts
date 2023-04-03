import { DataSource } from 'types/common/queryBuilder';

export interface IGetAggregateAttributePayload {
	aggregateOperator: string;
	dataSource: DataSource;
	searchText: string;
}
