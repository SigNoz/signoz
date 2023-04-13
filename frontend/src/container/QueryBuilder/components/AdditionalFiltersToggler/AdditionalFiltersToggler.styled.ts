import { MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
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

export const StyledWrapper = styled.div`
	display: flex;
	flex-direction: column;
	width: fit-content;
`;

export const StyledInner = styled.div`
	width: 100%;
	display: flex;
	align-items: center;
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
`;
