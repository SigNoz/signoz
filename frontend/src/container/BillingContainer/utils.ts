export const getRemainingDays = (billingEndDate: number): number => {
	// Convert Epoch timestamps to Date objects
	const startDate = new Date(); // Convert seconds to milliseconds
	const endDate = new Date(billingEndDate * 1000); // Convert seconds to milliseconds

	// Calculate the time difference in milliseconds
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const timeDifference = endDate - startDate;

	return Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
};
