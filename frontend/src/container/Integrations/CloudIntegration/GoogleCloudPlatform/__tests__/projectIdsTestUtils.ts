import { screen, userEvent } from 'tests/test-utils';

/** Opens the project IDs input and adds each ID the way a user does: type, then Enter. */
export const addProjectIds = async (
	user: ReturnType<typeof userEvent.setup>,
	testId: string,
	projectIds: string[],
): Promise<void> => {
	await user.click(screen.getByTestId(testId));
	const input = await screen.findByPlaceholderText(
		'Type a project ID and press Enter',
	);
	for (const projectId of projectIds) {
		// eslint-disable-next-line no-await-in-loop
		await user.type(input, `${projectId}{Enter}`);
	}
};
