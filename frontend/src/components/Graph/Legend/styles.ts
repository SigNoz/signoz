import styled from 'styled-components';

export const Container = styled.div`
	margin-left: 2rem;
	margin-right: 2rem;
	display: flex;
	cursor: pointer;
`;

interface Props {
	color: string;
}

export const ColorContainer = styled.div<Props>`
	background-color: ${({ color }): string => color};
	border-radius: 50%;
	width: 20px;
	height: 20px;
	margin-right: 0.5rem;
`;
