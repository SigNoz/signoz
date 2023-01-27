import styled from 'styled-components';

interface TextContainerProps {
	noButtonMargin?: boolean;
}

export const TextContainer = styled.div<TextContainerProps>`
	display: flex;

	> button {
		margin-left: ${({ noButtonMargin }): string =>
			noButtonMargin ? '0' : '0.5rem'}
`;
