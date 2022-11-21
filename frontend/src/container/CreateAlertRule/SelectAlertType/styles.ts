import { Card, Row } from 'antd';
import styled from 'styled-components';

export const SelectTypeContainer = styled.div`
	&&& {
		padding: 1rem;
	}
`;

export const AlertTypeCards = styled(Row)`
	&&& {
		flex-wrap: nowrap;
	}
`;

export const AlertTypeCard = styled(Card)`
	&&& {
		margin: 5px;
		width: 21rem;
		cursor: pointer;
	}
`;
