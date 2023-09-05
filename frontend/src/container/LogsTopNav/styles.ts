import { Button, ButtonProps } from 'antd';
import { themeColors } from 'constants/theme';
import styled, { css, FlattenSimpleInterpolation } from 'styled-components';

export const LiveButtonStyled = styled(Button)<ButtonProps>`
	background-color: rgba(${themeColors.buttonSuccessRgb}, 0.9);

	${({ danger }): FlattenSimpleInterpolation =>
		!danger
			? css`
					&:hover {
						background-color: rgba(${themeColors.buttonSuccessRgb}, 1) !important;
					}

					&:active {
						background-color: rgba(${themeColors.buttonSuccessRgb}, 0.7) !important;
					}
			  `
			: css``}
`;
