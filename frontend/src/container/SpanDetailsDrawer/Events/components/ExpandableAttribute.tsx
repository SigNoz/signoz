import { Button, Popover, Tooltip, Typography } from 'antd';
import { Fullscreen } from 'lucide-react';

interface ExpandableAttributeProps {
	attributeKey: string;
	attributeValue: string;
	onExpand: (title: string, content: string) => void;
}

function ExpandableAttribute({
	attributeKey,
	attributeValue,
	onExpand,
}: ExpandableAttributeProps): JSX.Element {
	const popoverContent = (
		<div className="stacktrace-popover">
			<pre className="stacktrace-preview">{attributeValue}</pre>
			<Button
				onClick={(): void => onExpand(attributeKey, attributeValue)}
				size="small"
				className="expand-button"
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

export default ExpandableAttribute;
