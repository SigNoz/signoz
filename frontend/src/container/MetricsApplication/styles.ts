import {
	Card as CardComponent,
	Col as ColComponent,
	Row as RowComponent,
	Typography,
} from 'antd';
import styled from 'styled-components';

export const Card = styled(CardComponent)`
	&&& {
		height: 40vh;
		overflow: hidden;
	}

	.ant-card-body {
		height: 100%;
		padding: 0;
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

export const ColApDexContainer = styled(ColComponent)`
	padding: 0 !important;
`;

export const ColErrorContainer = styled(ColComponent)`
	padding: 2rem 0 !important;
`;

export const GraphContainer = styled.div`
	min-height: calc(40vh - 40px);
	height: 100%;
`;

export const GraphTitle = styled(Typography)`
	&&& {
		text-align: center;
	}
`;
