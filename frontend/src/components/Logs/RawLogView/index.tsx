import { ExpandAltOutlined, LinkOutlined } from '@ant-design/icons';
// const Convert = require('ansi-to-html');
import Convert from 'ansi-to-html';
import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
// hooks
import { useIsDarkMode } from 'hooks/useDarkMode';
import { MouseEventHandler, useCallback, useMemo, useState } from 'react';
// interfaces
import { ILog } from 'types/api/logs/log';

// styles
import {
	CopyButton,
	ExpandIconWrapper,
	RawLogContent,
	RawLogViewContainer,
} from './styles';

const convert = new Convert();

interface RawLogViewProps {
	data: ILog;
	linesPerRow: number;
	onClickExpand: (log: ILog) => void;
	onCopyLogLink?: (id: string) => void;
}

function RawLogView(props: RawLogViewProps): JSX.Element {
	const { data, linesPerRow, onClickExpand, onCopyLogLink } = props;

	const [hasCopyLink, setHasCopyLink] = useState(false);

	const isDarkMode = useIsDarkMode();

	const text = useMemo(
		() =>
			typeof data.timestamp === 'string'
				? `${dayjs(data.timestamp).format()} | ${data.body}`
				: `${dayjs(data.timestamp / 1e6).format()} | ${data.body}`,
		[data.timestamp, data.body],
	);

	const handleClickExpand = useCallback(() => {
		onClickExpand(data);
	}, [onClickExpand, data]);

	const handleMouseAction = useCallback(() => {
		setHasCopyLink(!hasCopyLink);
	}, [hasCopyLink]);

	const handleCopyLink: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();

			if (!onCopyLogLink) return;

			onCopyLogLink(data.id);
		},
		[data.id, onCopyLogLink],
	);

	const html = useMemo(
		() => ({
			__html: convert.toHtml(dompurify.sanitize(text)),
		}),
		[text],
	);

	const mouseActions = useMemo(
		() => ({ onMouseEnter: handleMouseAction, onMouseLeave: handleMouseAction }),
		[handleMouseAction],
	);

	return (
		<RawLogViewContainer
			onClick={handleClickExpand}
			wrap={false}
			align="middle"
			$isDarkMode={isDarkMode}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...(onCopyLogLink && { ...mouseActions })}
		>
			<ExpandIconWrapper flex="30px">
				<ExpandAltOutlined />
			</ExpandIconWrapper>
			<RawLogContent linesPerRow={linesPerRow} dangerouslySetInnerHTML={html} />

			{hasCopyLink && (
				<Tooltip title="Copy link">
					<CopyButton
						size="small"
						onClick={handleCopyLink}
						icon={<LinkOutlined />}
					/>
				</Tooltip>
			)}
		</RawLogViewContainer>
	);
}

RawLogView.defaultProps = {
	onCopyLogLink: undefined,
};

export default RawLogView;
