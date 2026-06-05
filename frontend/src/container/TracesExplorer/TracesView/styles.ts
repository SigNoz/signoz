import styled from 'styled-components';

export const Container = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	height: calc(100vh - 240px);
	min-height: 400px;

	// Row hover affordance
	--row-hover-bg: var(--bg-ink-300);

	// Breathing room before the first column so cell content doesn't hug the corner.
	--tanstack-cell-padding-left-first-column: 12px;
`;

export const ActionsContainer = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
`;
