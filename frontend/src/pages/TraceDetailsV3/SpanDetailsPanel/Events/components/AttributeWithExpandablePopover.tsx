import { Button } from '@signozhq/ui/button';
import { Popover, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { Fullscreen } from '@signozhq/icons';

import styles from '../Events.module.scss';

import popoverStyles from './AttributeWithExpandablePopover.module.scss';

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
		<div className={popoverStyles.popover}>
			<pre className={popoverStyles.preview}>{attributeValue}</pre>
			<Button
				onClick={(): void => onExpand(attributeKey, attributeValue)}
				size="sm"
				className={popoverStyles.expandButton}
				prefix={<Fullscreen size={14} />}
			>
				Expand
			</Button>
		</div>
	);

	return (
		<div className={styles.attributeContainer} key={attributeKey}>
			<Tooltip title={attributeKey}>
				<Typography.Text className={styles.attributeKey} truncate={1}>
					{attributeKey}
				</Typography.Text>
			</Tooltip>

			<div className={styles.wrapper}>
				<Popover content={popoverContent} trigger="hover" placement="topRight">
					<Typography.Text className={styles.attributeValue} truncate={1}>
						{attributeValue}
					</Typography.Text>
				</Popover>
			</div>
		</div>
	);
}

export default AttributeWithExpandablePopover;
