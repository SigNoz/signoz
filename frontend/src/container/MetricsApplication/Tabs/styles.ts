import { Button as ButtonComponent } from 'antd';
import styled from 'styled-components';

interface Props {
	y: number;
	x: number;
	showbutton: boolean;
}

export const Button = styled(ButtonComponent)<Props>`
	&&& {
		position: absolute;
		top: ${({ y }): string => `${y}px`};
		left: ${({ x }): string => `${x}px`};
		display: ${({ showbutton }): string => (showbutton ? 'block' : 'none')};
		z-index: 999;
	}
`;
