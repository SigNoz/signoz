import { Tooltip, Typography } from 'antd';

import AttributeWithExpandablePopover from './AttributeWithExpandablePopover';

const EXPANDABLE_ATTRIBUTE_KEYS = ['exception.stacktrace', 'exception.message'];

interface EventAttributeProps {
	attributeKey: string;
	attributeValue: string;
	onExpand: (title: string, content: string) => void;
}

function EventAttribute({
	attributeKey,
	attributeValue,
	onExpand,
}: EventAttributeProps): JSX.Element {
	if (EXPANDABLE_ATTRIBUTE_KEYS.includes(attributeKey)) {
		return (
			<AttributeWithExpandablePopover
				attributeKey={attributeKey}
				attributeValue={attributeValue}
				onExpand={onExpand}
			/>
		);
	}

	return (
		<div className="attribute-container" key={attributeKey}>
			<Tooltip title={attributeKey}>
				<Typography.Text className="attribute-key" ellipsis>
					{attributeKey}
				</Typography.Text>
			</Tooltip>
			<div className="wrapper">
				<Tooltip title={attributeValue}>
					<Typography.Text className="attribute-value" ellipsis>
						{attributeValue}
					</Typography.Text>
				</Tooltip>
			</div>
		</div>
	);
}

export default EventAttribute;
