import './AttributeWithExpandablePopover.styles.scss';

import { Button, Popover, Tooltip, Typography } from 'antd';
import { Fullscreen } from 'lucide-react';

interface AttributeWithExpandablePopoverProps {
	attributeKey: string;
	attributeValue: string;
	onExpand: (title: string, content: string) => void;
}

function AttributeWithExpandablePopover({
	attributeKey,
	attributeValue,
	onExpand,
}: AttributeWithExpandablePopoverProps): JSX.Element {
	const popoverContent = (
		<div className="attribute-with-expandable-popover__popover">
			<pre className="attribute-with-expandable-popover__preview">
				{attributeValue}
			</pre>
			<Button
				onClick={(): void => onExpand(attributeKey, attributeValue)}
				size="small"
				className="attribute-with-expandable-popover__expand-button"
				icon={<Fullscreen size={14} />}
			>
				Expand
			</Button>
		</div>
	);

	return (
		<div className="attribute-container" key={attributeKey}>
			<Tooltip title={attributeKey}>
				<Typography.Text className="attribute-key" ellipsis>
					{attributeKey}
				</Typography.Text>
			</Tooltip>

			<div className="wrapper">
				<Popover content={popoverContent} trigger="hover" placement="topRight">
					<Typography.Text className="attribute-value" ellipsis>
						{attributeValue}
					</Typography.Text>
				</Popover>
			</div>
		</div>
	);
}

export default AttributeWithExpandablePopover;
