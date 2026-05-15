import { Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import AttributeWithExpandablePopover from './AttributeWithExpandablePopover';

const EXPANDABLE_ATTRIBUTE_KEYS = ['exception.stacktrace', 'exception.message'];
const ATTRIBUTE_LENGTH_THRESHOLD = 100;

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
	const shouldExpand =
		EXPANDABLE_ATTRIBUTE_KEYS.includes(attributeKey) ||
		attributeValue.length > ATTRIBUTE_LENGTH_THRESHOLD;

	if (shouldExpand) {
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
				<Typography.Text className="attribute-key" truncate={1}>
					{attributeKey}
				</Typography.Text>
			</Tooltip>
			<div className="wrapper">
				<Tooltip title={attributeValue}>
					<Typography.Text className="attribute-value" truncate={1}>
						{attributeValue}
					</Typography.Text>
				</Tooltip>
			</div>
		</div>
	);
}

export default EventAttribute;
