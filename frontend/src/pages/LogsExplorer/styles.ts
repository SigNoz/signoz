import { Col } from 'antd';
import { themeColors } from 'constants/theme';
import styled from 'styled-components';

export const WrapperStyled = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	color: ${themeColors.lightWhite};
`;

export const ButtonWrapperStyled = styled(Col)`
	margin-left: auto;
`;
