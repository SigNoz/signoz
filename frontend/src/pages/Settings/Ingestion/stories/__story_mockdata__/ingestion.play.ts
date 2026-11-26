/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import dayjs from 'dayjs';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	addTag,
	openCreateKey,
	submitCreateKey,
	untilLoaded,
} from '../Ingestion.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
}

export const showKeyLimits = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByText(
			/production-us-east/i,
			undefined,
			untilLoaded,
		),
	);
	await screen.findByRole('button', { name: 'Edit logs limit' }, untilLoaded);
};

export const openCreateForm = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openCreateKey(canvasElement);
};

export const typeNewTag = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const dialog = await openCreateKey(canvasElement);
	await userEvent.click(dialog.getByRole('button', { name: /New Tag/ }));
	await userEvent.keyboard('team-payments');
};

export const addTags = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const dialog = await openCreateKey(canvasElement);
	for (const tag of ['team-payments', 'env:production']) {
		await addTag(dialog, tag);
		await dialog.findByText(tag);
	}
};

export const addDuplicateTag = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const dialog = await openCreateKey(canvasElement);
	await addTag(dialog, 'team-payments');
	await addTag(dialog, 'team-payments');
	await dialog.findByDisplayValue('team-payments');
};

export const addLongTag = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const dialog = await openCreateKey(canvasElement);
	const tag =
		'team-payments-platform-observability-production-us-east-1-canary-collectors';
	await addTag(dialog, tag);
	await dialog.findByText(tag);
};

export const submitInvalidKey = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const dialog = await openCreateKey(canvasElement);
	await userEvent.type(dialog.getByLabelText('Name'), 'otel collectors');
	await userEvent.click(
		dialog.getByRole('button', { name: 'Create new Ingestion key' }),
	);
	await dialog.findByText(/should only contain letters/);
};

export const openExpiration = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const dialog = await openCreateKey(canvasElement);
	await userEvent.click(dialog.getByLabelText('Expiration'));
	await screen.findByTitle(dayjs().format('YYYY-MM-DD'));
};

export const submitHeldKey = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const dialog = await openCreateKey(canvasElement);
	await submitCreateKey(dialog);
	await waitFor(() =>
		expect(
			dialog.getByRole('button', { name: 'Create new Ingestion key' }),
		).toHaveAttribute('aria-busy', 'true'),
	);
};

export const submitRejectedKey = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const dialog = await openCreateKey(canvasElement);
	await submitCreateKey(dialog);
	await screen.findByText(
		'An ingestion key with this name already exists.',
		undefined,
		untilLoaded,
	);
};
