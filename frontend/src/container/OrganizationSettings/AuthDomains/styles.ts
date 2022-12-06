import { Row } from 'antd';
import styled from 'styled-components';

export const Container = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`;

export const ColumnWithTooltip = styled(Row)`
	&&& > article {
		margin-right: 0.5rem;
	}
`;
