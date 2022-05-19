import { Button as ButtonComponent } from 'antd';
import styled from 'styled-components';

export const Button = styled(ButtonComponent)`
	&&& {
		position: absolute;
		z-index: 999;
		display: none;
	}
`;
