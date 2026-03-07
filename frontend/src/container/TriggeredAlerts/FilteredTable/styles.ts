import { Card } from 'antd';
import styled from 'styled-components';

export const TableHeader = styled(Card)<Props>`
	&&& {
		flex: 1;
		text-align: center;
		.ant-card-body {
			padding: 1rem;
		}
		min-width: ${(props): string => props.minWidth || ''};
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
	overflowX?: string;
}
export const TableCell = styled.div<Props>`
	&&& {
		flex: 1;
		min-width: ${(props): string => props.minWidth || ''};
		display: flex;
		justify-content: flex-start;
		align-items: center;
		overflow-x: ${(props): string => props.overflowX || 'none'};
		::-webkit-scrollbar {
			height: ${(props): string => (props.overflowX ? '2px' : '8px')};
		}
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
