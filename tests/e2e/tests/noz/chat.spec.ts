import { expect, test } from '../../drivers/noz';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const QUESTION = 'Why is checkout slow?';
const REPLY = 'Checkout waits on the payment quota.';
const FOLLOW_UP = 'Since when?';
const FOLLOW_UP_REPLY = 'Since the 14:05 deploy.';

test.describe('Noz — chat', () => {
	test('TC-01 with an assistant URL the side nav opens a new chat', async ({
		noz,
	}) => {
		await noz.enable();
		await noz.gotoHome();
		await noz.navItem().click();

		await expect.poll(() => noz.conversationId()).toMatch(UUID);
		await expect(noz.input()).toBeVisible();
	});

	test('TC-02 a sent message reaches the assistant and its reply renders', async ({
		noz,
	}) => {
		const assistant = await noz.enable();
		assistant.replyWith(REPLY);
		await noz.gotoNew();
		await noz.send(QUESTION);

		await expect(noz.message(REPLY)).toBeVisible();
		await expect(noz.message(QUESTION)).toBeVisible();
		const [sent] = assistant.sentMessages();
		expect(sent.body.content).toBe(QUESTION);
		await expect.poll(() => noz.conversationId()).toBe(sent.threadId);
	});

	test('TC-03 a reload reopens the thread from the assistant', async ({
		noz,
	}) => {
		const assistant = await noz.enable();
		assistant.replyWith(REPLY);
		await noz.gotoNew();
		await noz.send(QUESTION);
		await expect(noz.message(REPLY)).toBeVisible();

		await noz.reload();

		await expect(noz.message(QUESTION)).toBeVisible();
		await expect(noz.message(REPLY)).toBeVisible();
	});

	test('TC-04 a follow-up stays in the same thread', async ({ noz }) => {
		const assistant = await noz.enable();
		assistant.replyWith(REPLY);
		assistant.replyWith(FOLLOW_UP_REPLY);
		await noz.gotoNew();
		await noz.send(QUESTION);
		await expect(noz.message(REPLY)).toBeVisible();

		await noz.send(FOLLOW_UP);

		await expect(noz.message(FOLLOW_UP_REPLY)).toBeVisible();
		await expect(noz.message(REPLY)).toBeVisible();
		const [first, second] = assistant.sentMessages();
		expect(second.body.content).toBe(FOLLOW_UP);
		expect(second.threadId).toBe(first.threadId);
		expect(noz.conversationId()).toBe(first.threadId);
	});

	test('TC-05 a new chat starts empty and the history list reopens the last one', async ({
		noz,
	}) => {
		const assistant = await noz.enable();
		assistant.replyWith(REPLY);
		await noz.gotoNew();
		await noz.send(QUESTION);
		await expect(noz.message(REPLY)).toBeVisible();
		const [{ threadId }] = assistant.sentMessages();

		await noz.newChatButton().click();

		await expect.poll(() => noz.conversationId()).not.toBe(threadId);
		await expect(noz.message(QUESTION)).toHaveCount(0);

		await noz.historyItem(threadId).click();

		await expect.poll(() => noz.conversationId()).toBe(threadId);
		await expect(noz.message(QUESTION)).toBeVisible();
		await expect(noz.message(REPLY)).toBeVisible();
	});

	test('TC-06 asking from the Logs Explorer sends that page as context', async ({
		noz,
	}) => {
		const assistant = await noz.enable();
		assistant.replyWith(REPLY);
		await noz.gotoLogsExplorer();

		await noz.askNozButton().click();
		await noz.send(QUESTION);

		await expect(noz.message(REPLY)).toBeVisible();
		const [sent] = assistant.sentMessages();
		expect(sent.body.contexts).toContainEqual(
			expect.objectContaining({ source: 'auto', type: 'logs_explorer' }),
		);
	});
});
