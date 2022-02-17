import styled from 'styled-components';
import { Card } from 'antd';

export const CardComponent = styled(Card)`
	&&& {
		height: 1.375rem;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;

		.ant-card-body {
			padding: 0;
		}
	}
`;
