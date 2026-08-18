import styled from 'styled-components';

export const WrapperStyled = styled.div`
	height: 95%;
	min-width: 0;
	overflow: hidden;

	& .ant-table-wrapper {
		height: 100%;
		min-width: 0;
	}
	& .ant-spin-nested-loading {
		height: 100%;
		min-width: 0;
	}

	& .ant-spin-container {
		height: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	& .ant-table {
		flex: 1;
		min-width: 0;
		overflow-x: hidden;
		overflow-y: auto;

		> .ant-table-container {
			min-width: 0;

			> .ant-table-content {
				overflow-x: auto !important;

				> table {
					min-width: 99% !important;
				}
			}
		}
	}
`;
