import styled from 'styled-components';
import { Select as SelectComponent } from 'antd';

export const Select = styled(SelectComponent)`
	&&& {
		min-width: 300px;
	}
`;

export const Container = styled.div`
	&&& {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 1rem;
	}
`;

export const TableContainer = styled.div`
	&&& {
		margin-top: 2rem;
	}
`;

export const NoTableContainer = styled.div`
	&&& {
		margin-top: 2rem;
	}
`;
