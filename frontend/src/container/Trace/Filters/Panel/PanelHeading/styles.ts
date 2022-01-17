import styled, { css } from 'styled-components';

interface Props {
	disabled: boolean;
}

export const Container = styled.div<Props>`
	&&& {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-left: 0.5rem;
		min-height: 5vh;

		cursor: ${({ disabled }) => disabled && 'not-allowed'};

		${({ disabled }) =>
			disabled &&
			css`
				opacity: 0.5;
			`}
	}
`;

export const IconContainer = styled.div`
	&&& {
		margin-right: 0.5rem;
	}
`;

export const TextCotainer = styled.div`
	&&& {
		display: flex;
		cursor: pointer;
	}
`;
