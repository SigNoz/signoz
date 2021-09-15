import styled from 'styled-components';

interface TextContainerProps {
	noButtonMargin?: boolean;
}

export const TextContainer = styled.div<TextContainerProps>`
	display: flex;
	margin-top: 1rem;
	margin-bottom: 1rem;

	> button {
		margin-left: ${({ noButtonMargin }): string => {
			return noButtonMargin ? '0' : '0.5rem';
		}}
`;
