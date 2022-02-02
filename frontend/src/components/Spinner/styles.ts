import React from 'react';
import styled from 'styled-components';

interface Props {
	height: React.CSSProperties['height'];
	color: React.CSSProperties['color'];
}

export const SpinerStyle = styled.div<Props>`
	z-index: 999;
	overflow: visible;
	margin: auto;
	display: flex;
	justify-content: center;
	align-items: center;
	height: ${({ height = '100vh' }): number | string => height};
	& .ant-spin {
		color: ${({ color }): string | undefined => color};
	}
`;
