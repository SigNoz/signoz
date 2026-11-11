import { Badge } from '@signozhq/ui/badge';
import { Pill } from '@signozhq/ui/pill';
import { Tooltip } from '@signozhq/ui/tooltip';
import cx from 'classnames';

import type { DowntimeAlertOption } from './types';

interface AlertRuleTagsProps {
	selectedTags: DowntimeAlertOption[];
	closable: boolean;
	handleClose?: (removedTag: DowntimeAlertOption['value']) => void;
	classname?: string;
}
export function AlertRuleTags(props: AlertRuleTagsProps): JSX.Element {
	const { closable, selectedTags, handleClose, classname } = props;
	return (
		<div
			style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}
			className={cx('alert-rule-tags', classname)}
		>
			{selectedTags?.map((tag: DowntimeAlertOption, index: number) => {
				if (closable) {
					return (
						<Pill.Closeable
							key={tag.value}
							maxWidth={200}
							onClose={(): void => handleClose?.(tag.value)}
						>
							{tag.label}
						</Pill.Closeable>
					);
				}

				const isLongTag = (tag?.label as string)?.length > 20;
				const tagElem = (
					<Badge
						textTransform="none"
						key={tag.value}
						color={index % 2 ? 'highlight-danger' : 'primary'}
						variant="outlined"
					>
						{isLongTag
							? `${(tag?.label as string | null)?.slice(0, 20)}...`
							: tag?.label}
					</Badge>
				);
				return (
					<Tooltip title={isLongTag ? tag?.label : undefined} key={tag?.value}>
						{tagElem}
					</Tooltip>
				);
			})}
		</div>
	);
}
