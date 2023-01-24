import { Card, Typography } from 'antd';
import styled from 'styled-components';

export const Container = styled(Card)`
	height: 100%;
	.ant-card-body {
		height: 100%;
	}
`;

interface TitleProps {
	light?: string;
}

export const Title = styled(Typography)<TitleProps>`
	&&& {
		margin-top: 0.5rem;
		margin-bottom: 1rem;
		font-weight: ${({ light }): string => (light === 'true' ? 'none' : 'bold')};
	}
`;

interface TextContainerProps {
	noButtonMargin?: boolean;
}

export const TextContainer = styled.div<TextContainerProps>`
	display: flex;
	margin-top: 1rem;
	margin-bottom: 1rem;

	> button {
		margin-left: ${({ noButtonMargin }): string =>
			noButtonMargin ? '0' : '0.5rem'}
`;

export const NullButtonContainer = styled.div`
	margin-bottom: 1rem;
`;
