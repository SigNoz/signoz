import styled from 'styled-components';
import { Card } from 'antd';

export const TableHeader = styled(Card)`
	&&& {
		flex: 1;
		.ant-card-body {
			padding: 1rem;
		}
	}
`;

export const TableHeaderContainer = styled.div`
	display: flex;
`;

export const Container = styled.div`
	&&& {
		display: flex;
		margin-top: 1rem;
		flex-direction: column;
	}
`;

export const TableRow = styled(Card)`
	&&& {
		flex: 1;
		.ant-card-body {
			padding: 0rem;
			display: flex;

			min-height: 5rem;
		}
	}
`;

export const TableCell = styled.div`
	&&& {
		flex: 1;
	}
`;
