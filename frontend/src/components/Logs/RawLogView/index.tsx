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
	AddButtonWrapper,
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
	const [isAddButtonsVisible, setAddButtonVisible] = useState<boolean>(false);

	const isDarkMode = useIsDarkMode();

	const text = useMemo(
		() => `${dayjs(data.timestamp / 1e6).format()} | ${data.body}`,
		[data.timestamp, data.body],
	);

	const handleClickExpand = useCallback(() => {
		onClickExpand(data);
	}, [onClickExpand, data]);

	const html = useMemo(
		() => ({
			__html: convert.toHtml(dompurify.sanitize(text)),
		}),
		[text],
	);

	const showContextHandler: MouseEventHandler<Element> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		console.log('e', event);
	};

	const copyLinkHandler: MouseEventHandler<Element> = (event) => {
		event.preventDefault();
		event.stopPropagation();
		console.log('Test');
	};

	const showButtons = (): void => {
		setAddButtonVisible(true);
	};

	const hideButtons = (): void => {
		setAddButtonVisible(false);
	};

	return (
		<RawLogViewContainer
			onClick={handleClickExpand}
			wrap={false}
			align="middle"
			$isDarkMode={isDarkMode}
			onMouseOver={showButtons}
			onMouseLeave={hideButtons}
		>
			<ExpandIconWrapper flex="30px">
				<ExpandAltOutlined />
			</ExpandIconWrapper>
			<RawLogContent linesPerRow={linesPerRow} dangerouslySetInnerHTML={html} />
			{isAddButtonsVisible && (
				<AddButtonWrapper>
					<Tooltip title="Show context">
						<Button onClick={showContextHandler}>
							<MonitorOutlined />
						</Button>
					</Tooltip>
					<Tooltip title="Copy link">
						<Button onClick={copyLinkHandler}>
							<LinkOutlined />
						</Button>
					</Tooltip>
				</AddButtonWrapper>
			)}
		</RawLogViewContainer>
	);
}

export default RawLogView;
