import styled from 'styled-components';

interface Props {
	isDashboardPage: boolean;
}
export const ValueContainer = styled.div<Props>`
	height: ${({ isDashboardPage }): string =>
		isDashboardPage ? '24vh' : '55vh'};
	display: flex;
	justify-content: center;
	align-items: center;
`;
