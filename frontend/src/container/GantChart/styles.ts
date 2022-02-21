import styled from 'styled-components';

export const Wrapper = styled.ul`
	ul {
		list-style: none;
		border-left: 1px solid #434343;
		width: 100%;
	}

	ul li {
		position: relative;

		&:before {
			position: absolute;
			left: -39px;
			top: 10px;
			content: '';
			height: 1px;
			width: 2.2rem;
			background-color: #434343;
		}
	}
`;

export const CardWrapper = styled.div`
	display: flex;
	width: 100%;
`;

export const CardContainer = styled.li`
	display: flex;
	width: 100%;
`;
