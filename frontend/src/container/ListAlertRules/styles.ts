import { Button as ButtonComponent } from 'antd';
import styled from 'styled-components';

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 2rem;
		align-items: center;
	}
`;

export const Button = styled(ButtonComponent)`
	&&& {
		margin-left: 1rem;
	}
`;
