import { Button } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	min-width: 8rem;
`;

export const ButtonContainer = styled(Button)`
	&&& {
		padding-left: 0.5rem;
		padding-right: 0.5rem;
	}
`;
