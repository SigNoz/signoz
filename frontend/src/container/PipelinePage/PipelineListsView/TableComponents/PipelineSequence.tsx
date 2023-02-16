import { Avatar } from 'antd';
import { themeColors } from 'constants/theme';
import React from 'react';

function PipelineSequence({
	value,
}: PipelineSequenceProps): React.ReactElement {
	return (
		<Avatar style={{ background: themeColors.navyBlue }} size="small">
			{value}
		</Avatar>
	);
}

interface PipelineSequenceProps {
	value: number;
}
export default PipelineSequence;
