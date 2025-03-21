import styled from 'styled-components';

interface InfinityWrapperStyledProps {
	children?: React.ReactNode;
}

export const InfinityWrapperStyled = styled.div<InfinityWrapperStyledProps>`
	flex: 1;
	height: 40rem !important;
	display: flex;
	height: 100%;
`;
