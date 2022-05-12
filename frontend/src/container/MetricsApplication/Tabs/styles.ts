import { Button as ButtonComponent } from 'antd';
import styled from 'styled-components';

import { Card } from '../styles';

export const Button = styled(ButtonComponent)`
	&&& {
		position: absolute;
		z-index: 999;
		display: none;
	}
`;
export const TableContainerCard = styled(Card)`
	overflow-x: auto;
`;
