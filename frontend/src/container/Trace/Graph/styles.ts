import { StyledCSS } from 'container/GantChart/Trace/styles';
import React from 'react';
import styled, { css } from 'styled-components';

interface Props {
	center?: boolean;
	ref?: React.RefObject<HTMLDivElement> | null; // The ref type provided by react-use is incorrect -> https://github.com/streamich/react-use/issues/1264 Open Issue
}

export const Container = styled.div<Props>`
	height: 25vh !important;
	margin-top: 1rem;
	margin-bottom: 1rem;
	overflow: auto;
	width: 100% !important;

	${({ center }): StyledCSS =>
		center &&
		css`
			display: flex;
			justify-content: center;
			align-items: center;
		`}
`;
