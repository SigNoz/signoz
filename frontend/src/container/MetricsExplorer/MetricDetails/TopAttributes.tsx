import { Button, Collapse, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { TopAttributesProps } from './types';

function TopAttributes({
	items,
	title,
	loadMore,
	hideLoadMore,
}: TopAttributesProps): JSX.Element {
	const [activeKey, setActiveKey] = useState<string | string[]>(
		'top-attributes',
	);

	const collapseItems = useMemo(
		() => [
			{
				label: (
					<div className="metrics-accordion-header">
						<Typography.Text>{title}</Typography.Text>
					</div>
				),
				key: 'top-attributes',
				children: (
					<div className="top-attributes-content">
						{items.map((item) => (
							<div className="top-attributes-item" key={item.key}>
								<div className="top-attributes-item-progress">
									<div className="top-attributes-item-key">{item.key}</div>
									<div className="top-attributes-item-count">{item.count}</div>
									<div
										className="top-attributes-item-progress-bar"
										style={{ width: `${item.percentage}%` }}
									/>
								</div>
								<div className="top-attributes-item-percentage">
									{item.percentage.toFixed(2)}%
								</div>
							</div>
						))}
						{loadMore && !hideLoadMore && (
							<div className="top-attributes-load-more">
								<Button type="link" onClick={loadMore}>
									Load more
								</Button>
							</div>
						)}
					</div>
				),
			},
		],
		[title, items, loadMore, hideLoadMore],
	);

	return (
		<Collapse
			bordered
			className="metrics-accordion"
			activeKey={activeKey}
			onChange={(keys): void => setActiveKey(keys)}
			items={collapseItems}
		/>
	);
}

export default TopAttributes;
