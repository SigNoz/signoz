import { Card } from 'antd';
import styled from 'styled-components';

export const Container = styled(Card)`
	position: relative;
	margin: 0.5rem 0;
	.ant-card-body {
		height: 20vh;
		min-height: 200px;
	}
`;
