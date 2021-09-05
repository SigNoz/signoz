import { Card, Tooltip } from 'antd';
import styled from 'styled-components';

export const Container = styled(Card)`
	min-height: 55vh;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
`;

export const AlertIconContainer = styled(Tooltip)`
	position: absolute;
	top: 10px;
	left: 10px;
`;
