import { Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import styles from '../Events.module.scss';

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
		<div className={styles.attributeContainer} key={attributeKey}>
			<Tooltip title={attributeKey}>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="secondary"
					as="p"
					textOverflow="ellipsis"
				>
					{attributeKey}
				</Typography>
			</Tooltip>
			<div className={styles.wrapper}>
				<Tooltip title={attributeValue}>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="main"
						as="p"
						textOverflow="ellipsis"
					>
						{attributeValue}
					</Typography>
				</Tooltip>
			</div>
		</div>
	);
}

export default EventAttribute;
