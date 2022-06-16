import { Tag } from 'antd';
import React from 'react';
import { EQueryType } from 'types/common/dashboard';

function QueryTypeTag({ queryType }): JSX.Element {
	switch (queryType) {
		case EQueryType.QUERY_BUILDER:
			return (
				<span>
					<Tag color="geekblue">Query Builder</Tag>
				</span>
			);

		case EQueryType.CLICKHOUSE:
			return (
				<span>
					<Tag color="orange">ClickHouse Query</Tag>
				</span>
			);
		case EQueryType.PROM:
			return (
				<span>
					<Tag color="green">PromQL</Tag>
				</span>
			);
		default:
			return <span />;
	}
}

export default QueryTypeTag;
