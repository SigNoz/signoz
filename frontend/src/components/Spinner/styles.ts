import React from 'react';
import styled from 'styled-components';

interface Props {
	height: React.CSSProperties['height'];
}

export const SpinerStyle = styled.div<Props>`
	z-index: 999;
	overflow: visible;
	margin: auto;
	display: flex;
	justify-content: center;
	align-items: center;
	height: ${({ height = '100vh' }) => height};
`;
