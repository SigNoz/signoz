import { CSSProperties } from 'react';
import { Typography } from '@signozhq/ui/typography';
import styled from 'styled-components';

export const tableStyles: CSSProperties = {
	cursor: 'unset',
};

export const Container = styled.div`
	display: flex;
	flex-direction: column;
	--typography-color: var(--l1-foreground);
`;

export const ErrorText = styled(Typography)`
	text-align: center;
`;

export const DateText = styled(Typography)`
	min-width: 145px;
`;
