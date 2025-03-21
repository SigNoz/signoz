import styled from 'styled-components';

interface ContainerProps {
	children?: React.ReactNode;
	className?: string;
}

export const Container = styled.div<ContainerProps>`
	margin: 1rem 0;
`;

export const ActionsWrapper = styled.div`
	display: flex;
	justify-content: flex-end;
`;
