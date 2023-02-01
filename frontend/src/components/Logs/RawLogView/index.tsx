import { ExpandAltOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import dayjs from 'dayjs';
// hooks
import { useIsDarkMode } from 'hooks/useDarkMode';
import React, { useCallback } from 'react';
// interfaces
import { ILog } from 'types/api/logs/log';

// styles
import { ExpandIconWrapper, RawLogViewContainer } from './styles';

type RawLogViewProps = {
	data: ILog;
	linesPerRow: number;
	onClickExpand: (log: ILog) => void;
};

function RawLogView(props: RawLogViewProps): JSX.Element {
	const { data, linesPerRow, onClickExpand } = props;

	const isDarkMode = useIsDarkMode();

	const text = `${dayjs((data.timestamp as never) / 1e6).format()} | ${
		data.body
	}`;

	const handleClickExpand = useCallback(() => {
		onClickExpand(data);
	}, [onClickExpand, data]);

	return (
		<RawLogViewContainer wrap={false} align="middle" $isDarkMode={isDarkMode}>
			<ExpandIconWrapper flex="30px" onClick={handleClickExpand}>
				<ExpandAltOutlined />
			</ExpandIconWrapper>
			<Typography.Paragraph
				style={{ marginBottom: 0, fontFamily: 'Courier New' }}
				ellipsis={{ rows: linesPerRow, tooltip: true }}
			>
				{text}
			</Typography.Paragraph>
		</RawLogViewContainer>
	);
}

export default RawLogView;
