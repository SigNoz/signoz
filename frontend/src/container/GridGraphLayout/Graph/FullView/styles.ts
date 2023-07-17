import styled from 'styled-components';

export const NotFoundContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 55vh;
`;

export const TimeContainer = styled.div`
	display: flex;
	justify-content: flex-end;
`;

export const GraphContainer = styled.div`
	height: 50%;
`;

export const FilterTableAndSaveContainer = styled.div`
	margin-top: 1.875rem;
	display: flex;
	align-items: flex-end;
`;

export const FilterTableContainer = styled.div`
	flex-basis: 80%;
`;

export const SaveContainer = styled.div`
	flex-basis: 20%;
	display: flex;
	justify-content: flex-end;

	.save-container-button {
		margin: 0 0.313rem;
	}
`;

export const LabelContainer = styled.button`
	max-width: 18.75rem;
	cursor: pointer;
	border: none;
	background-color: transparent;
	color: white;
`;
