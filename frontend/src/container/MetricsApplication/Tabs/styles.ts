import { Button as ButtonComponent } from 'antd';
import styled from 'styled-components';

interface Props {
	y: number;
	x: number;
	show: boolean;
}

export const Button = styled(ButtonComponent)<Props>`
	&&& {
		position: absolute;
		top: ${({ y }): string => `${y}px`};
		left: ${({ x }): string => `${x}px`};
		display: ${({ show }): string => (show ? 'block' : 'none')};
		z-index: 999;
	}
`;
