import { Tag } from 'antd';
import React, { useCallback } from 'react';
import { EQueryType } from 'types/common/dashboard';

function PlotTag({ queryType }) {
	const TagComponent = useCallback(() => {
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
	}, [queryType]);

	if (queryType === undefined) {
		return null;
	}

	return (
		<div style={{ marginLeft: '2rem', position: 'absolute', top: '1rem' }}>
			Plotted using <TagComponent />
		</div>
	);
}

export default PlotTag;
