import { ExpandAltOutlined } from '@ant-design/icons';
// const Convert = require('ansi-to-html');
import Convert from 'ansi-to-html';
import dayjs from 'dayjs';
import dompurify from 'dompurify';
// hooks
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback, useMemo } from 'react';
// interfaces
import { ILog } from 'types/api/logs/log';

// styles
import {
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

	return (
		<RawLogViewContainer
			onClick={handleClickExpand}
			wrap={false}
			align="middle"
			$isDarkMode={isDarkMode}
		>
			<ExpandIconWrapper flex="30px">
				<ExpandAltOutlined />
			</ExpandIconWrapper>
			<RawLogContent linesPerRow={linesPerRow} dangerouslySetInnerHTML={html} />
		</RawLogViewContainer>
	);
}

export default RawLogView;
