import { Button } from 'antd';
import styled from 'styled-components';

export const StyledButton = styled(Button)<{ $isAvailableToDisable: boolean }>`
	min-width: 2rem;
	height: 2.25rem;
	padding: ${(props): string =>
		props.$isAvailableToDisable ? '0.43rem' : '0.43rem 0.68rem'};
	border-radius: 0.375rem;
	pointer-events: ${(props): string =>
		props.$isAvailableToDisable ? 'default' : 'none'};
`;
