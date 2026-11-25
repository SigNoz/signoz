import { screen, userEvent } from 'tests/test-utils';

/** Opens the project IDs input and adds each ID the way a user does: paste, then Enter. */
export const addProjectIds = async (
	user: ReturnType<typeof userEvent.setup>,
	testId: string,
	projectIds: string[],
): Promise<void> => {
	await user.click(screen.getByTestId(testId));
	await user.click(await screen.findByTestId(`${testId}-search`));
	for (const projectId of projectIds) {
		// eslint-disable-next-line no-await-in-loop
		await user.paste(projectId);
		// eslint-disable-next-line no-await-in-loop
		await user.keyboard('{Enter}');
	}
};
