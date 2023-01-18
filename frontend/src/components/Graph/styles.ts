import styled from 'styled-components';

export const LegendsContainer = styled.div`
	height: 17%;

	* {
		::-webkit-scrollbar {
			width: 8px;
		}
		::-webkit-scrollbar-track {
			background: transparent;
		}
		::-webkit-scrollbar-thumb {
			background: #888;
			border-radius: 10px;
		}
		::-webkit-scrollbar-thumb:hover {
			background: #555;
		}
	}
`;
