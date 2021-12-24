import { Button, Row } from 'antd';
import styled from 'styled-components';

export const NewDashboardButton = styled(Button)`
	&&& {
		display: flex;
		justify-content: center;
		align-items: center;

		margin-left: 1rem;
	}
`;

export const TableContainer = styled(Row)`
	&&& {
		margin-top: 1rem;
	}
`;

export const ButtonContainer = styled.div`
	&&& {
		display: flex;
		align-items: center;
	}
`;
