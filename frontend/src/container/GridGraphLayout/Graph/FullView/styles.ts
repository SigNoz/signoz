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
	margin-top: 30px;
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

	> button {
		margin: 0 5px;
	}
`;
