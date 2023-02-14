import { Avatar } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const ModalFooterTitle = styled.span`
	font-style: normal;
	font-weight: 400;
	font-size: 0.875rem;
	line-height: 1.25rem;
`;

export const PipelineIndexIcon = styled(Avatar)`
	background-color: ${themeColors.navyBlue};
	position: relative;
	top: 0.625rem;
`;
