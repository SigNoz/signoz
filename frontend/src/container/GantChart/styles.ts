import styled from 'styled-components';

export const Wrapper = styled.ul`
	padding-left: 0;
	position: absolute;
	width: 100%;
	height: 100%;

	ul {
		list-style: none;
		border-left: 1px solid #434343;
		padding-left: 8px;
		width: 100%;
	}

	ul li {
		position: relative;

		&:before {
			position: absolute;
			left: -0.5rem;
			top: 10px;
			content: '';
			height: 1px;
			width: 0.5rem;
			background-color: #434343;
		}
	}
`;

export const CardWrapper = styled.div`
	display: flex;
	width: 100%;
	margin-left: 0.5rem;
	margin-top: 1.5rem;
`;

export const CardContainer = styled.li`
	display: flex;
	width: 100%;
`;

export const CollapseButton = styled.div`
	position: absolute;
	top: 0;
	left: 0;
`;
