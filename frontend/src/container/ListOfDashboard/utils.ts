export const filterDashboard = (
	searchValue: string,
	dashboardList: any,
): any[] => {
	// Convert the searchValue to lowercase for case-insensitive search
	const searchValueLowerCase = searchValue.toLowerCase();

	// Use the filter method to find matching objects
	return dashboardList.filter((item: any) => {
		// Convert each property value to lowercase for case-insensitive search
		const itemValues = Object.values(item?.data).map((value: any) =>
			value.toString().toLowerCase(),
		);

		// Check if any property value contains the searchValue
		return itemValues.some((value) => value.includes(searchValueLowerCase));
	});
};
