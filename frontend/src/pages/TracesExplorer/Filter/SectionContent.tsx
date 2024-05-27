import { Button, Card, Checkbox, Tooltip } from 'antd';
import { ParaGraph } from 'container/Trace/Filters/Panel/PanelBody/Common/styles';
import { useFetchKeysAndValues } from 'hooks/queryBuilder/useFetchKeysAndValues';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useState } from 'react';
import { TraceFilterEnum } from 'types/reducer/trace';

interface SectionBodyProps {
	type: TraceFilterEnum;
}

export function SectionBody(props: SectionBodyProps): JSX.Element {
	const { type } = props;
	const [visibleItemsCount, setVisibleItemsCount] = useState(10);

	const { currentQuery } = useQueryBuilder();
	const { results, isFetching } = useFetchKeysAndValues(
		`${type} =`,
		currentQuery?.builder?.queryData[0] || null,
		type,
	);

	const handleShowMore = (): void => {
		setVisibleItemsCount((prevCount) => prevCount + 10);
	};

	return (
		<Card bordered={false} className="section-card" loading={isFetching}>
			{results
				.slice(0, visibleItemsCount)
				.filter((i) => i.length)
				.map((item) => (
					<Checkbox className="submenu-checkbox" key={`${type}-${item}`}>
						<Tooltip overlay={<div>{item}</div>}>
							<ParaGraph ellipsis style={{ maxWidth: 200 }}>
								{item}
							</ParaGraph>
						</Tooltip>
					</Checkbox>
				))}
			{visibleItemsCount < results.length && (
				<Button onClick={handleShowMore} type="link">
					Show More
				</Button>
			)}
		</Card>
	);
}
