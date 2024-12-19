import { Button, Card, Col } from 'antd';
import styled, { CSSProperties } from 'styled-components';

export const ExplorerCardHeadContainer = styled(Card)`
	margin: 1rem 0;
	padding: 0;
`;

export const OffSetCol = styled(Col)`
	text-align: right;
`;

export const SaveButton = styled(Button)`
	&&& {
		margin: 1rem 0;
		width: 5rem;
	}
`;

export const DropDownOverlay: CSSProperties = {
	maxHeight: '20rem',
	overflowY: 'auto',
	width: '20rem',
	padding: 0,
};

export const MenuItemContainer = styled(Card)`
	padding: 0;
`;
