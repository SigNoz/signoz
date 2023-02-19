import { Avatar } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const PipelineIndexIcon = styled(Avatar)`
	background-color: ${themeColors.navyBlue};
`;

export const ProcessorTypeWrapper = styled.div`
	display: flex;
	flex-direction: column;
	padding-bottom: 0.5rem;
`;
