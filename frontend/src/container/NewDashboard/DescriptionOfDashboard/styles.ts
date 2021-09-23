import { Button as ButtonComponent } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	margin-top: 0.5rem;
`;

export const Button = styled(ButtonComponent)`
	&&& {
		display: flex;
		align-items: center;
	}
`;
