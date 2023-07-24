import {
	ExpandAltOutlined,
	LinkOutlined,
	MonitorOutlined,
} from '@ant-design/icons';
// const Convert = require('ansi-to-html');
import Convert from 'ansi-to-html';
import { Button, Tooltip } from 'antd';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
// hooks
import { useIsDarkMode } from 'hooks/useDarkMode';
import { MouseEventHandler, useCallback, useMemo, useState } from 'react';
// interfaces
import { ILog } from 'types/api/logs/log';

// styles
import {
	ActionButtonsWrapper,
	ExpandIconWrapper,
	RawLogContent,
	RawLogViewContainer,
} from './styles';

const convert = new Convert();

interface RawLogViewProps {
	data: ILog;
	linesPerRow: number;
	isReadOnly?: boolean;
	isActiveLog?: boolean;
	onClickExpand?: (log: ILog) => void;
	onOpenLogsContext?: (log: ILog) => void;
	onCopyLogLink?: (id: string) => void;
}

function RawLogView(props: RawLogViewProps): JSX.Element {
	const {
		data,
		linesPerRow,
		isReadOnly = false,
		isActiveLog = false,
		onClickExpand,
		onCopyLogLink,
		onOpenLogsContext,
	} = props;

	const [hasActionButtons, setHasActionButtons] = useState(false);

	const isDarkMode = useIsDarkMode();

	const text = useMemo(
		() =>
			typeof data.timestamp === 'string'
				? `${dayjs(data.timestamp).format()} | ${data.body}`
				: `${dayjs(data.timestamp / 1e6).format()} | ${data.body}`,
		[data.timestamp, data.body],
	);

	const handleClickExpand = useCallback(() => {
		if (!onClickExpand) return;

		onClickExpand(data);
	}, [onClickExpand, data]);

	const handleMouseAction = useCallback(() => {
		setHasActionButtons(!hasActionButtons);
	}, [hasActionButtons]);

	const handleCopyLink: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();

			if (!onCopyLogLink) return;

			onCopyLogLink(data.id);
		},
		[data.id, onCopyLogLink],
	);

	const handleShowContext: MouseEventHandler<HTMLElement> = useCallback(
		(event) => {
			event.preventDefault();
			event.stopPropagation();

			if (!onOpenLogsContext) return;

			onOpenLogsContext(data);
		},
		[data, onOpenLogsContext],
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
			$isReadOnly={isReadOnly}
			$isActiveLog={isActiveLog}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...(onCopyLogLink && { ...mouseActions })}
		>
			{onClickExpand && (
				<ExpandIconWrapper flex="30px">
					<ExpandAltOutlined />
				</ExpandIconWrapper>
			)}

			<RawLogContent
				$isReadOnly={isReadOnly}
				$isActiveLog={isActiveLog}
				linesPerRow={linesPerRow}
				dangerouslySetInnerHTML={html}
			/>

			{hasActionButtons && (
				<ActionButtonsWrapper>
					<Tooltip title="Show Context">
						<Button
							size="small"
							icon={<MonitorOutlined />}
							onClick={handleShowContext}
						/>
					</Tooltip>
					<Tooltip title="Copy Link">
						<Button size="small" icon={<LinkOutlined />} onClick={handleCopyLink} />
					</Tooltip>
				</ActionButtonsWrapper>
			)}
		</RawLogViewContainer>
	);
}

RawLogView.defaultProps = {
	isReadOnly: false,
	isActiveLog: false,
	onCopyLogLink: undefined,
	onClickExpand: undefined,
	onOpenLogsContext: undefined,
};

export default RawLogView;
