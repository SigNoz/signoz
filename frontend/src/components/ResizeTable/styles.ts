import React from 'react';
import styled from 'styled-components';

type SpanProps = React.HTMLAttributes<HTMLSpanElement>;

export const SpanStyle = styled.span<SpanProps>`
	position: absolute;
	right: -0.313rem;
	bottom: 0;
	z-index: 1;
	width: 0.625rem;
	height: 100%;
	cursor: col-resize;
	margin-left: 4px;
	margin-right: 4px;
`;

export const DragSpanStyle = styled.span<SpanProps>`
	display: flex;
	margin: -1rem;
	padding: 1rem;
`;
