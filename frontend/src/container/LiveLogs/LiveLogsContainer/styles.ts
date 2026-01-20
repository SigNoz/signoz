import { Row } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

import LiveLogsListChart from '../LiveLogsListChart';

export const LiveLogsChart = styled(LiveLogsListChart)`
	margin-bottom: 0.5rem;
`;

export const ContentWrapper = styled(Row)`
	color: rgba(${(themeColors.white, 0.85)});
`;

export const Wrapper = styled.div`
	padding-bottom: 4rem;
	padding-top: 1rem;
	padding-left: 1rem;
	padding-right: 1rem;
`;
