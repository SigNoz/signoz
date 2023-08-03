import {
	Card as CardComponent,
	Col as ColComponent,
	Row as RowComponent,
	Typography,
} from 'antd';
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

export const Col = styled(ColComponent)`
	display &&& {
		position: relative;
	}
`;

export const ColContainer = styled.div`
	padding: 2rem 0;
`;

export const GraphContainer = styled.div`
	height: 40vh;
`;

export const GraphTitle = styled(Typography)`
	&&& {
		text-align: center;
	}
`;
