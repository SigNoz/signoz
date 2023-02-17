import { ExpandAltOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import dayjs from 'dayjs';
// hooks
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback, useMemo } from 'react';
// interfaces
import { ILog } from 'types/api/logs/log';

import { rawLineStyle } from './config';
// styles
import { ExpandIconWrapper, RawLogViewContainer } from './styles';

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

	const ellipsis = useMemo(() => ({ rows: linesPerRow }), [linesPerRow]);

	const handleClickExpand = useCallback(() => {
		onClickExpand(data);
	}, [onClickExpand, data]);

	return (
		<RawLogViewContainer wrap={false} align="middle" $isDarkMode={isDarkMode}>
			<ExpandIconWrapper flex="30px" onClick={handleClickExpand}>
				<ExpandAltOutlined />
			</ExpandIconWrapper>
			<Typography.Paragraph style={rawLineStyle} ellipsis={ellipsis}>
				{text}
			</Typography.Paragraph>
		</RawLogViewContainer>
	);
}

export default RawLogView;
