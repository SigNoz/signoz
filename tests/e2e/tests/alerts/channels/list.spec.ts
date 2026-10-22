import { expect, test } from '../../../drivers/channels';

test.describe('Notification channels — list', () => {
	test('TC-01 search narrows the list to the matching channel', async ({
		channels,
		channelSet,
	}) => {
		await channels.list.goto({ search: channelSet.prefix });
		await expect(channels.list.rows()).toHaveCount(2);

		await channels.list.search().fill(channelSet.slack.name);
		await expect(channels.list.row(channelSet.slack.name)).toBeVisible();
		await expect(channels.list.row(channelSet.email.name)).toHaveCount(0);
	});

	test('TC-02 the kind filter keeps only channels of that kind', async ({
		channels,
		channelSet,
	}) => {
		await channels.list.goto({ search: channelSet.prefix, kind: 'email' });

		await expect(channels.list.row(channelSet.email.name)).toBeVisible();
		await expect(channels.list.row(channelSet.slack.name)).toHaveCount(0);
	});

	test('TC-03 a search matching nothing offers to clear itself', async ({
		channels,
		channelSet,
	}) => {
		await channels.list.goto({ search: `${channelSet.prefix}-nothing-matches` });

		await expect(channels.list.noResults()).toBeVisible();
		await channels.list.clearSearch();
	});

	test('TC-04 clicking a row opens that channel for editing', async ({
		channels,
		channelSet,
		authedPage,
	}) => {
		await channels.list.goto({ search: channelSet.slack.name });
		await channels.list.row(channelSet.slack.name).click();

		await authedPage.waitForURL(/\/alerts\/channels\/edit\//);
		await expect(channels.form.name()).toHaveValue(channelSet.slack.name);
	});

	test('TC-05 View JSON shows the channel with its secrets masked', async ({
		channels,
		channelSet,
		authedPage,
	}) => {
		await channels.list.goto({ search: channelSet.slack.name });
		await channels.list.openRowMenu(channelSet.slack.name);
		await channels.list.chooseMenuItem('View JSON');

		await expect(channels.list.jsonDialog()).toBeVisible();
		await expect(channels.list.jsonDialog()).toContainText('"kind": "slack"');
		await expect(
			authedPage.getByTestId('channel-json-toggle-secrets'),
		).toBeVisible();
	});
});
