import styled, { css } from 'styled-components';

interface Props {
	center?: boolean;
}

export const Container = styled.div<Props>`
	height: 20vh;
	margin-top: 1rem;
	margin-bottom: 1rem;

	${({ center }) =>
		center &&
		css`
			display: flex;
			justify-content: center;
			align-items: center;
		`}
`;
