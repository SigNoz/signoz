import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { Color } from '@signozhq/design-tokens';
import { Col, Typography } from 'antd';
import styled, { css } from 'styled-components';

const IconCss = css`
	margin-right: 0.6875rem;
	transition: all 0.2s ease;
`;

export const StyledIconOpen = styled(PlusSquareOutlined)`
	${IconCss}
`;

export const StyledIconClose = styled(MinusSquareOutlined)`
	${IconCss}
`;

export const StyledInner = styled(Col)`
	width: fit-content;
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 0.875rem;
	min-height: 1.375rem;
	cursor: pointer;
	&:hover {
		${StyledIconOpen}, ${StyledIconClose} {
			opacity: 0.7;
		}
	}
`;

export const StyledLink = styled(Typography.Link)`
	pointer-events: none;
	color: ${Color.BG_ROBIN_400} !important;
`;
