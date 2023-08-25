import { Row } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

import LiveLogsListChart from '../LiveLogsListChart';

export const LiveLogsChart = styled(LiveLogsListChart)`
	margin-bottom: 0.5rem;
`;

export const Wrapper = styled(Row)`
	color: rgba(${(themeColors.white, 0.85)});
`;
