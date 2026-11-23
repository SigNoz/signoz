import { CSSProperties } from 'react';
import styled from 'styled-components';

export const tableStyles: CSSProperties = {
	cursor: 'unset',
};

export const Container = styled.div`
	display: flex;
	flex-direction: column;
	--typography-color: var(--l1-foreground);
`;
