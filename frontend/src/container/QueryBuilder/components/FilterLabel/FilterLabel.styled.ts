import styled from 'styled-components';

interface Props {
	isDarkMode: boolean;
}
export const StyledLabel = styled.div<Props>`
	padding: 0 0.6875rem;
	min-height: 2rem;
	min-width: 5.625rem;
	display: inline-flex;
	white-space: nowrap;
	align-items: center;
	border-radius: 0.125rem;
`;
