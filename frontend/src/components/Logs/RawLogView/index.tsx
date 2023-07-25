import { ExpandAltOutlined, LinkOutlined } from '@ant-design/icons';
// const Convert = require('ansi-to-html');
import Convert from 'ansi-to-html';
import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
import useCopyLogLink from 'hooks/useCopyLogLink';
// hooks
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useCallback, useMemo, useState } from 'react';
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
}

function RawLogView(props: RawLogViewProps): JSX.Element {
	const { data, linesPerRow, onClickExpand } = props;

	const { isHighlighted, isLogsExplorerPage, onLogCopy } = useCopyLogLink(
		data.id,
	);

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
		if (!isLogsExplorerPage) return;

		setHasCopyLink(!hasCopyLink);
	}, [isLogsExplorerPage, hasCopyLink]);

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
			$isActiveLog={isHighlighted}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...mouseActions}
		>
			<ExpandIconWrapper flex="30px">
				<ExpandAltOutlined />
			</ExpandIconWrapper>
			<RawLogContent linesPerRow={linesPerRow} dangerouslySetInnerHTML={html} />

			{hasCopyLink && (
				<Tooltip title="Copy Link">
					<CopyButton size="small" onClick={onLogCopy} icon={<LinkOutlined />} />
				</Tooltip>
			)}
		</RawLogViewContainer>
	);
}

export default RawLogView;
