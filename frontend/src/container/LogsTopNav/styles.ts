import { green } from '@ant-design/colors';
import { Button, ButtonProps } from 'antd';
import styled, { css, FlattenSimpleInterpolation } from 'styled-components';

export const LiveButtonStyled = styled(Button)<ButtonProps>`
	background-color: ${green[6]};

	${({ danger }): FlattenSimpleInterpolation =>
		!danger
			? css`
					&:hover {
						background-color: ${green[5]} !important;
					}

					&:active {
						background-color: ${green[7]} !important;
					}
			  `
			: css``}
`;
