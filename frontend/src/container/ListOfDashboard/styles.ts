import { Button, Row } from 'antd';
import styled from 'styled-components';

export const NewDashboardButton = styled(Button)`
	&&& {
		display: flex;
		justify-content: center;
		align-items: center;
	}
`;

export const TableContainer = styled(Row)`
	&&& {
		margin-top: 1rem;
	}
`;
