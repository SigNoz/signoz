import { Card } from 'antd';
import styled from 'styled-components';

export const TableHeader = styled(Card)`
	&&& {
		flex: 1;
		text-align: center;
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

			min-height: 3rem;
		}
	}
`;

interface Props {
	minWidth?: string;
}
export const TableCell = styled.div<Props>`
	&&& {
		flex: 1;
		min-width: ${(props): string => props.minWidth || ''};
		display: flex;
		justify-content: flex-start;
		align-items: center;
	}
`;

export const StatusContainer = styled.div`
	&&& {
		display: flex;
		align-items: center;
		height: 100%;
	}
`;

export const IconContainer = styled.div`
	&&& {
		margin-left: 1rem;
		margin-right: 1rem;
	}
`;
