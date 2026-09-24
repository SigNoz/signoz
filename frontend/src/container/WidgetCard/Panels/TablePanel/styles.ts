import styled from 'styled-components';

export const WrapperStyled = styled.div`
	height: 95%;
	overflow: hidden;

	& .ant-table-wrapper {
		height: 100%;
	}
	& .ant-spin-nested-loading {
		height: 100%;
	}

	& .ant-spin-container {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	& .ant-table {
		flex: 1;
		overflow: auto;

		> .ant-table-container {
			> .ant-table-content {
				> table {
					min-width: 99% !important;
				}
			}
		}
	}
`;
