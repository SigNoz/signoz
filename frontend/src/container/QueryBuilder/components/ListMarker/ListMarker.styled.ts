import { Button } from 'antd';
import styled from 'styled-components';

export const StyledButton = styled(Button)<{ isAvailableToDisable: boolean }>`
	min-width: 2rem;
	height: 2.25rem;
	padding: 0.125rem;
	border-radius: 0.375rem;
	margin-right: 0.1rem;
	pointer-events: ${(props): string =>
		props.isAvailableToDisable ? 'default' : 'none'};
`;
