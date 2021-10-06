import { Card as CardComponent, Row as RowComponent, Typography } from 'antd';
import styled from 'styled-components';

export const Card = styled(CardComponent)`
	&&& {
		padding: 10px;
	}

	.ant-card-body {
		padding: 0;
		min-height: 40vh;
	}
`;

export const Row = styled(RowComponent)`
	&&& {
		padding: 1rem;
	}
`;

export const GraphContainer = styled.div`
	div {
		min-height: 40vh;
		max-height: 40vh;
	}
`;

export const GraphTitle = styled(Typography)`
	&&& {
		text-align: center;
	}
`;
