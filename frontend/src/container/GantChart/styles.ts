import styled from 'styled-components';

export const Wrapper = styled.ul`
	padding-left: 0;
	position: absolute;
	width: 100%;
	height: 100%;

	ul {
		list-style: none;
		border-left: 1px solid #434343;
		padding-left: 1rem;
		width: 100%;
		margin: 0px;
	}

	ul li {
		position: relative;

		&:before {
			position: absolute;
			left: -1rem;
			top: 10px;
			content: '';
			height: 1px;
			width: 1rem;
			background-color: #434343;
		}
	}
`;

export const CardWrapper = styled.div`
	display: flex;
	width: 100%;
	margin-left: 1rem;
	margin-top: 1.5rem;
`;

export const CardContainer = styled.li`
	display: flex;
	width: 100%;
	position: relative;
`;

export const CollapseButton = styled.div`
	position: absolute;
	top: 0;
`;
