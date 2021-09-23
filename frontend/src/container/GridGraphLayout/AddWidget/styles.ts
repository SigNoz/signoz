import { Button as ButtonComponent } from 'antd';
import styled from 'styled-components';

export const Button = styled(ButtonComponent)`
	&&& {
		display: flex;
		justify-content: center;
		align-items: center;
		border: none;
	}
`;

export const Container = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100%;
`;
