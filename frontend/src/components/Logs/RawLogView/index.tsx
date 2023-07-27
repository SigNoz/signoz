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
import useCopyLogLink from 'hooks/useCopyLogLink';
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
	isActiveLog?: boolean;
	isReadOnly?: boolean;
	data: ILog;
	linesPerRow: number;
	onClickExpand?: (log: ILog) => void;
	onOpenLogsContext?: (log: ILog) => void;
}

function RawLogView(props: RawLogViewProps): JSX.Element {
	const {
		isActiveLog = false,
		isReadOnly = false,
		data,
		linesPerRow,
		onClickExpand,
		onOpenLogsContext,
	} = props;

	const { isHighlighted, isLogsExplorerPage, onLogCopy } = useCopyLogLink(
		data.id,
	);

	const [hasActionButtons, setHasActionButtons] = useState<boolean>(false);

	const isDarkMode = useIsDarkMode();
	const isReadOnlyLog = !isLogsExplorerPage || isReadOnly;

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

	const handleMouseEnter = useCallback(() => {
		if (isReadOnlyLog) return;

		setHasActionButtons(true);
	}, [isReadOnlyLog]);

	const handleMouseLeave = useCallback(() => {
		if (isReadOnlyLog) return;

		setHasActionButtons(false);
	}, [isReadOnlyLog]);

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
		() => ({ onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave }),
		[handleMouseEnter, handleMouseLeave],
	);

	return (
		<RawLogViewContainer
			onClick={handleClickExpand}
			wrap={false}
			align="middle"
			$isDarkMode={isDarkMode}
			$isReadOnly={isReadOnly}
			$isActiveLog={isHighlighted}
			// eslint-disable-next-line react/jsx-props-no-spreading
			{...mouseActions}
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
						<Button size="small" icon={<LinkOutlined />} onClick={onLogCopy} />
					</Tooltip>
				</ActionButtonsWrapper>
			)}
		</RawLogViewContainer>
	);
}

RawLogView.defaultProps = {
	isActiveLog: false,
	isReadOnly: false,
	onClickExpand: undefined,
	onOpenLogsContext: undefined,
};

export default RawLogView;
