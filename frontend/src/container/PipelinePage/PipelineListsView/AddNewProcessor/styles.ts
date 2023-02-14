import { Avatar } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const PipelineIndexIcon = styled(Avatar)`
	background-color: ${themeColors.navyBlue};
	position: relative;
	top: 0.625rem;
`;

export const ProcessorTypeWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.625rem;
	margin-top: 0.625rem;
`;
