/* eslint-disable sonarjs/cognitive-complexity */
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
	MessageActionDTO,
	MessageSummaryDTOBlocksAnyOfItem,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import {
	approveExecution,
	cancelExecution,
	clarifyExecution,
	createThread,
	getThreadDetail,
	listThreads,
	MessageContext,
	MessageSummary,
	regenerateMessage,
	rejectExecution,
	sendMessage as sendMessageToThread,
	SSEStreamError,
	streamEvents,
	submitFeedback,
	ThreadSummary,
	updateThread,
} from '../../../api/ai-assistant/chat';
import {
	Conversation,
	ConversationStreamState,
	FeedbackRating,
	Message,
	MessageAttachment,
	MessageBlock,
	MessageRole,
} from '../types';

// ---------------------------------------------------------------------------
// Types used by module-level helpers
// ---------------------------------------------------------------------------

type StoreSetter = (fn: (s: AIAssistantStore) => void) => void;
type StoreGetter = () => AIAssistantStore;

interface SSEStreamCtx {
	conversationId: string;
	set: StoreSetter;
	signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Per-conversation AbortControllers
// ---------------------------------------------------------------------------

const streamControllers = new Map<string, AbortController>();

function abortStream(conversationId: string): void {
	const ctrl = streamControllers.get(conversationId);
	if (ctrl) {
		ctrl.abort();
		streamControllers.delete(conversationId);
	}
}

function newStreamController(conversationId: string): AbortController {
	abortStream(conversationId);
	const ctrl = new AbortController();
	streamControllers.set(conversationId, ctrl);
	return ctrl;
}

/**
 * Gracefully disconnects from a conversation's SSE stream:
 * 1. Aborts the HTTP connection (backend execution keeps running).
 * 2. Commits any buffered text as a message so it's not lost.
 * 3. Removes the stream entry.
 *
 * Safe to call even if the conversation is not currently streaming.
 */
async function fetchAllThreadSummaries(
	archived: 'true' | 'false',
): Promise<ThreadSummary[]> {
	const allThreads: ThreadSummary[] = [];
	let cursor: string | null = null;
	do {
		// eslint-disable-next-line no-await-in-loop
		const page = await listThreads({
			archived,
			limit: 50,
			cursor,
			sort: 'updated_desc',
		});
		allThreads.push(...page.threads);
		cursor = page.hasMore ? (page.nextCursor ?? null) : null;
	} while (cursor);
	return allThreads;
}

function disconnectAndCommit(
	conversationId: string,
	set: StoreSetter,
	get: StoreGetter,
): void {
	abortStream(conversationId);

	const stream = get().streams[conversationId];
	if (!stream) {
		return;
	}

	set((s) => {
		const st = s.streams[conversationId];
		if (!st) {
			return;
		}
		const conv = s.conversations[conversationId];
		if (conv && st.streamingContent.trim()) {
			const blocks = streamEventsToBlocks(st.streamingEvents);
			conv.messages.push({
				id: st.streamingMessageId ?? uuidv4(),
				role: 'assistant',
				content: st.streamingContent,
				blocks: blocks.length > 0 ? blocks : undefined,
				createdAt: Date.now(),
			});
			conv.updatedAt = Date.now();
		}
		delete s.streams[conversationId];
	});
}

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

/**
 * Drips a text chunk word-by-word with small random delays to produce a
 * smooth typing effect when large SSE deltas arrive all at once.
 */
async function animateDelta(
	delta: string,
	onWord: (word: string) => void,
): Promise<void> {
	const words = delta.split(/(?<=\s)/);
	for (const word of words) {
		// eslint-disable-next-line no-await-in-loop
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 12 + Math.random() * 18);
		});
		onWord(word);
	}
}

/**
 * Appends one text chunk to a conversation's stream state.
 * Operates on the per-conversation ConversationStreamState.
 */
function appendTextToStream(
	stream: ConversationStreamState,
	messageId: string,
	chunk: string,
): void {
	if (!stream.streamingMessageId) {
		stream.streamingMessageId = messageId;
	}
	stream.streamingContent += chunk;
	const last = stream.streamingEvents[stream.streamingEvents.length - 1];
	if (last?.kind === 'text') {
		last.content += chunk;
	} else {
		stream.streamingEvents.push({ kind: 'text', content: chunk });
	}
}

/**
 * Creates a fresh stream entry for a conversation.
 */
function resetStreamingState(
	s: AIAssistantStore,
	conversationId: string,
): void {
	s.streams[conversationId] = {
		isStreaming: true,
		streamingContent: '',
		streamingStatus: '',
		streamingEvents: [],
		streamingMessageId: null,
		streamingActions: null,
		pendingApproval: null,
		pendingClarification: null,
	};
}

/**
 * Runs one SSE execution stream, updating the per-conversation stream state.
 *
 * Breaks early and sets pendingApproval / pendingClarification when the
 * agent needs user input before it can continue.
 *
 * Throws on `error` events — the caller's catch block handles UI feedback.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
async function runStreamingLoop(
	executionId: string,
	ctx: SSEStreamCtx,
): Promise<void> {
	const { conversationId, set, signal } = ctx;

	for await (const event of streamEvents(executionId, signal)) {
		if (signal?.aborted) {
			return;
		}

		if (event.type === 'status') {
			set((s) => {
				const st = s.streams[conversationId];
				if (st) {
					st.streamingStatus = event.state;
				}
			});
		} else if (event.type === 'message') {
			if (event.delta) {
				// eslint-disable-next-line no-await-in-loop
				await animateDelta(event.delta, (word) => {
					set((s) => {
						const st = s.streams[conversationId];
						if (st) {
							appendTextToStream(st, event.messageId, word);
						}
					});
				});
			}
			if (event.done) {
				set((s) => {
					const st = s.streams[conversationId];
					if (st && event.actions && event.actions.length > 0) {
						// MessageActionEventDTO is structurally identical to MessageActionDTO.
						st.streamingActions = event.actions as MessageActionDTO[];
					}
				});
				// Don't break here — `message.done` marks the end of this
				// message, not the stream. A clarification/approval event may
				// follow in the same stream. The loop ends on the explicit
				// `done` event type (or `approval`/`clarification`, which
				// pause the stream).
			}
		} else if (event.type === 'thinking') {
			set((s) => {
				const st = s.streams[conversationId];
				if (!st) {
					return;
				}
				const last = st.streamingEvents[st.streamingEvents.length - 1];
				if (last?.kind === 'thinking') {
					last.content += event.content;
				} else {
					st.streamingEvents.push({
						kind: 'thinking',
						content: event.content,
					});
				}
			});
		} else if (event.type === 'tool_call') {
			set((s) => {
				const st = s.streams[conversationId];
				if (st) {
					st.streamingEvents.push({
						kind: 'tool',
						toolCall: {
							toolName: event.toolName,
							input: event.toolInput,
							done: false,
							displayText: event.displayText,
						},
					});
				}
			});
		} else if (event.type === 'tool_result') {
			set((s) => {
				const st = s.streams[conversationId];
				if (!st) {
					return;
				}
				const toolEvent = [...st.streamingEvents]
					.reverse()
					.find(
						(e) =>
							e.kind === 'tool' &&
							e.toolCall.toolName === event.toolName &&
							!e.toolCall.done,
					);
				if (toolEvent?.kind === 'tool') {
					toolEvent.toolCall.result = event.result;
					toolEvent.toolCall.done = true;
				}
			});
		} else if (event.type === 'approval') {
			set((s) => {
				const st = s.streams[conversationId];
				if (st) {
					// The SSE event is already an `ApprovalEventDTO`, the same
					// shape the slot is typed against — pass through verbatim
					// rather than re-projecting (which previously dropped any
					// fields the projection didn't enumerate explicitly).
					st.pendingApproval = event;
					st.streamingStatus = 'awaiting_approval';
					st.isStreaming = false;
				}
			});
			break;
		} else if (event.type === 'clarification') {
			set((s) => {
				const st = s.streams[conversationId];
				if (st) {
					// Same rationale as the approval branch — `event` is a
					// `ClarificationEventDTO` whose `fields` already carry
					// `allowCustom` (which the previous manual projection
					// silently stripped).
					st.pendingClarification = event;
					st.streamingStatus = 'awaiting_clarification';
					st.isStreaming = false;
				}
			});
			break;
		} else if (event.type === 'error') {
			throw Object.assign(new Error(event.error.message), {
				retryAction: event.retryAction,
			});
		} else if (event.type === 'conversation' && event.title) {
			set((s) => {
				if (s.conversations[conversationId]) {
					s.conversations[conversationId].title = event.title;
				}
			});
		} else if (event.type === 'done') {
			break;
		}
	}
}

/**
 * Converts streaming event items into persisted MessageBlocks.
 */
function streamEventsToBlocks(
	events: ConversationStreamState['streamingEvents'],
): MessageBlock[] {
	return events
		.map((e): MessageBlock | null => {
			if (e.kind === 'text') {
				return { type: 'text', content: e.content };
			}
			if (e.kind === 'thinking') {
				return { type: 'thinking', content: e.content };
			}
			if (e.kind === 'tool') {
				return {
					type: 'tool_call',
					toolCallId: e.toolCall.toolName, // best available id during streaming
					toolName: e.toolCall.toolName,
					toolInput: e.toolCall.input,
					result: e.toolCall.result,
					success: e.toolCall.done,
					displayText: e.toolCall.displayText,
				};
			}
			return null;
		})
		.filter((b): b is MessageBlock => b !== null);
}

/**
 * Commits accumulated streaming text as a message and removes the stream entry.
 */
function finalizeStreamingMessage(
	conversationId: string,
	set: StoreSetter,
	get: StoreGetter,
): void {
	const stream = get().streams[conversationId];
	if (!stream) {
		return;
	}
	const {
		streamingMessageId,
		streamingContent,
		streamingEvents,
		streamingActions,
	} = stream;

	set((s) => {
		const conv = s.conversations[conversationId];
		if (conv && streamingContent.trim()) {
			const blocks = streamEventsToBlocks(streamingEvents);
			conv.messages.push({
				id: streamingMessageId ?? uuidv4(),
				role: 'assistant',
				content: streamingContent,
				blocks: blocks.length > 0 ? blocks : undefined,
				actions: streamingActions ?? undefined,
				createdAt: Date.now(),
			});
			conv.updatedAt = Date.now();
		}
		delete s.streams[conversationId];
	});
}

function hasPendingInput(conversationId: string, get: StoreGetter): boolean {
	const stream = get().streams[conversationId];
	return Boolean(stream?.pendingApproval || stream?.pendingClarification);
}

/**
 * Commits an error message and removes the stream entry.
 */
function finalizeStreamingError(
	conversationId: string,
	errorContent: string,
	set: StoreSetter,
): void {
	set((s) => {
		const conv = s.conversations[conversationId];
		if (conv) {
			conv.messages.push({
				id: uuidv4(),
				role: 'assistant',
				content: errorContent,
				createdAt: Date.now(),
			});
			conv.updatedAt = Date.now();
		}
		delete s.streams[conversationId];
	});
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface AIAssistantStore {
	// UI state
	isDrawerOpen: boolean;
	isModalOpen: boolean;
	activeConversationId: string | null;

	// Data
	conversations: Record<string, Conversation>;

	// Per-conversation streaming state
	streams: Record<string, ConversationStreamState>;

	/**
	 * Persists answered state for interactive blocks (ai-question, ai-confirm)
	 * so re-renders/remounts don't reset the answered UI.
	 */
	answeredBlocks: Record<string, string>;

	// Loading state
	isLoadingThreads: boolean;
	isLoadingThread: boolean;

	// Actions
	openDrawer: () => void;
	closeDrawer: () => void;
	openModal: () => void;
	closeModal: () => void;
	minimizeModal: () => void;
	fetchThreads: () => Promise<void>;
	loadThread: (threadId: string) => Promise<void>;
	startNewConversation: () => string;
	setActiveConversation: (id: string) => void;
	clearConversation: (id: string) => void;
	archiveConversation: (id: string) => void;
	restoreConversation: (id: string) => void;
	renameConversation: (id: string, title: string) => Promise<void>;
	markBlockAnswered: (messageId: string, answer: string) => void;
	sendMessage: (
		text: string,
		attachments?: MessageAttachment[],
		contexts?: MessageContext[],
	) => Promise<void>;
	approveAction: (conversationId: string, approvalId: string) => Promise<void>;
	rejectAction: (conversationId: string, approvalId: string) => Promise<void>;
	submitClarification: (
		conversationId: string,
		clarificationId: string,
		answers: Record<string, unknown>,
	) => Promise<void>;
	cancelStream: (conversationId: string) => void;
	regenerateAssistantMessage: (
		conversationId: string,
		messageId: string,
	) => Promise<void>;
	submitMessageFeedback: (
		messageId: string,
		rating: FeedbackRating,
		comment?: string,
	) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Server → client converters
// ---------------------------------------------------------------------------

/**
 * The DTO models a persisted block as `{ [key: string]: unknown }`. This
 * helper narrows each entry to the typed `MessageBlock` discriminated union
 * the UI renders against.
 */
function toBlocks(
	raw: MessageSummaryDTOBlocksAnyOfItem[] | null | undefined,
): MessageBlock[] | undefined {
	if (!raw || raw.length === 0) {
		return undefined;
	}
	return raw
		.map((b): MessageBlock | null => {
			if (b.type === 'text') {
				return {
					type: 'text',
					content: typeof b.content === 'string' ? b.content : '',
				};
			}
			if (b.type === 'thinking') {
				return {
					type: 'thinking',
					content: typeof b.content === 'string' ? b.content : '',
				};
			}
			if (b.type === 'tool_call' && typeof b.toolName === 'string') {
				return {
					type: 'tool_call',
					toolCallId: typeof b.toolCallId === 'string' ? b.toolCallId : '',
					toolName: b.toolName,
					toolInput: b.toolInput,
					result: b.result,
					success: typeof b.success === 'boolean' ? b.success : undefined,
					displayText: typeof b.displayText === 'string' ? b.displayText : undefined,
				};
			}
			return null;
		})
		.filter((b): b is MessageBlock => b !== null);
}

/**
 * `sendMessage` prepends a `[PAGE_CONTEXT]…[/PAGE_CONTEXT]` block to the user's
 * text so the agent has the available page actions + state. The backend stores
 * and returns the full string, which would otherwise leak into the user's
 * bubble on reload. Strip it once here so every consumer of the store sees
 * just the original prompt.
 */
const PAGE_CONTEXT_PREFIX_RE = /^\[PAGE_CONTEXT\][\s\S]*?\[\/PAGE_CONTEXT\]\n?/;

function stripPageContextPrefix(content: string): string {
	return content.replace(PAGE_CONTEXT_PREFIX_RE, '');
}

/**
 * Parse a backend ISO timestamp into ms epoch, falling back to `now()` when the
 * value is missing or unparseable. Without this guard, a null/invalid date from
 * the API turns into NaN and surfaces in the UI as "Invalid Date".
 */
function toMs(value: string | null | undefined): number {
	const t = value ? new Date(value).getTime() : NaN;
	return Number.isFinite(t) ? t : Date.now();
}

function toMessage(m: MessageSummary): Message {
	const rawContent = m.content ?? '';
	const content =
		m.role === 'user' ? stripPageContextPrefix(rawContent) : rawContent;
	return {
		id: m.messageId,
		role: m.role as MessageRole,
		content,
		blocks: toBlocks(m.blocks),
		actions: m.actions ?? undefined,
		feedbackRating: m.feedbackRating ?? undefined,
		createdAt: toMs(m.createdAt),
	};
}

// ---------------------------------------------------------------------------
// Misc store helpers
// ---------------------------------------------------------------------------

function deriveTitle(text: string): string {
	const trimmed = text.trim().replace(/\s+/g, ' ');
	return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAIAssistantStore = create<AIAssistantStore>()(
	persist(
		immer<AIAssistantStore>((set, get) => ({
			isDrawerOpen: false,
			isModalOpen: false,
			activeConversationId: null,
			conversations: {},
			streams: {},
			isLoadingThreads: false,
			isLoadingThread: false,
			answeredBlocks: {},

			openDrawer: (): void => {
				set((state) => {
					state.isDrawerOpen = true;
					if (!state.activeConversationId) {
						const id = uuidv4();
						state.conversations[id] = {
							id,
							messages: [],
							createdAt: Date.now(),
							updatedAt: Date.now(),
						};
						state.activeConversationId = id;
					}
				});
			},

			closeDrawer: (): void => {
				set((state) => {
					state.isDrawerOpen = false;
				});
			},

			openModal: (): void => {
				set((state) => {
					state.isModalOpen = true;
					if (!state.activeConversationId) {
						const id = uuidv4();
						state.conversations[id] = {
							id,
							messages: [],
							createdAt: Date.now(),
							updatedAt: Date.now(),
						};
						state.activeConversationId = id;
					}
				});
			},

			closeModal: (): void => {
				set((state) => {
					state.isModalOpen = false;
				});
			},

			minimizeModal: (): void => {
				set((state) => {
					state.isModalOpen = false;
					state.isDrawerOpen = true;
					if (!state.activeConversationId) {
						const id = uuidv4();
						state.conversations[id] = {
							id,
							messages: [],
							createdAt: Date.now(),
							updatedAt: Date.now(),
						};
						state.activeConversationId = id;
					}
				});
			},

			fetchThreads: async (): Promise<void> => {
				set((s) => {
					s.isLoadingThreads = true;
				});
				try {
					const [activeThreads, archivedThreads] = await Promise.all([
						fetchAllThreadSummaries('false'),
						fetchAllThreadSummaries('true'),
					]);
					const allThreads = [...activeThreads, ...archivedThreads];

					let activeThreadIdToLoad: string | null = null;

					set((s) => {
						const serverThreadIds = new Set(
							allThreads.map((thread) => thread.threadId),
						);

						for (const [id, conv] of Object.entries(s.conversations)) {
							if (conv.threadId && !serverThreadIds.has(conv.threadId)) {
								delete s.conversations[id];
							}
						}

						for (const thread of allThreads) {
							const existingEntry = Object.entries(s.conversations).find(
								([, conv]) => conv.threadId === thread.threadId,
							);
							const mapped = {
								id: thread.threadId,
								threadId: thread.threadId,
								title: thread.title ?? undefined,
								messages: existingEntry?.[1].messages ?? [],
								createdAt: toMs(thread.createdAt),
								updatedAt: toMs(thread.updatedAt),
								archived: thread.archived,
							};

							if (existingEntry && existingEntry[0] !== thread.threadId) {
								delete s.conversations[existingEntry[0]];
							}

							s.conversations[thread.threadId] = mapped;
						}

						s.isLoadingThreads = false;

						// Clear the rehydrate-time hydration flag on any entries
						// the server didn't claim — those are local-only chats
						// the user started but never sent. Server-mapped entries
						// were already replaced above and don't carry the flag.
						for (const conv of Object.values(s.conversations)) {
							if (conv.isHydrating) {
								delete conv.isHydrating;
							}
						}

						// If the active conversation matches a known thread but
						// has no messages yet (typical on refresh), flip to the
						// per-thread loading flag in the same set() so the
						// skeleton stays visible without a flicker.
						const id = s.activeConversationId;
						if (id) {
							const conv = s.conversations[id];
							if (conv?.threadId && conv.messages.length === 0) {
								activeThreadIdToLoad = conv.threadId;
								s.isLoadingThread = true;
							}
						}
					});

					// Hydrate the active conversation's messages on reload. The
					// rehydrate-time loadThread used to do this, but it ran at
					// module-load — before the AI base URL was configured — so
					// it always failed. Now that fetchThreads has populated
					// `threadId`s, we can confidently load the right one.
					if (activeThreadIdToLoad) {
						void get().loadThread(activeThreadIdToLoad);
					}
				} catch (err) {
					console.error('[AIAssistant] fetchThreads failed:', err);
					set((s) => {
						s.isLoadingThreads = false;
						for (const conv of Object.values(s.conversations)) {
							if (conv.isHydrating) {
								delete conv.isHydrating;
							}
						}
					});
				}
			},

			// eslint-disable-next-line sonarjs/cognitive-complexity
			loadThread: async (threadId: string): Promise<void> => {
				set((s) => {
					s.isLoadingThread = true;
					s.activeConversationId = threadId;
				});
				try {
					const detail = await getThreadDetail(threadId);
					set((s) => {
						s.conversations[threadId] = {
							id: threadId,
							threadId: detail.threadId,
							title: detail.title ?? undefined,
							messages: (detail.messages ?? [])
								.filter((m) => m.content != null && m.content.trim() !== '')
								.map(toMessage),
							createdAt: toMs(detail.createdAt),
							updatedAt: toMs(detail.updatedAt),
							archived: detail.archived,
						};
						if (detail.pendingApproval || detail.pendingClarification) {
							s.streams[threadId] = {
								isStreaming: false,
								streamingContent: '',
								streamingStatus: detail.pendingApproval
									? 'awaiting_approval'
									: 'awaiting_clarification',
								streamingEvents: [],
								streamingMessageId: null,
								streamingActions: null,
								// ApprovalSummaryDTO / ClarificationSummaryDTO are structurally
								// compatible with the SSE event DTOs used by ConversationStreamState.
								pendingApproval: detail.pendingApproval ?? null,
								pendingClarification: detail.pendingClarification ?? null,
							};
						}
						s.isLoadingThread = false;
					});

					// Reconnect to SSE if backend execution is still running
					// and we don't already have an active SSE reader for this thread
					if (
						detail.activeExecutionId &&
						!streamControllers.has(threadId) &&
						!detail.pendingApproval &&
						!detail.pendingClarification
					) {
						set((s) => {
							resetStreamingState(s, threadId);
						});
						const ctrl = newStreamController(threadId);
						try {
							await runStreamingLoop(detail.activeExecutionId, {
								conversationId: threadId,
								set,
								signal: ctrl.signal,
							});
						} finally {
							streamControllers.delete(threadId);
						}
						if (!hasPendingInput(threadId, get)) {
							finalizeStreamingMessage(threadId, set, get);
						}
					}
				} catch (err) {
					if (err instanceof DOMException && err.name === 'AbortError') {
						return;
					}
					console.error('[AIAssistant] loadThread failed:', err);
					set((s) => {
						s.isLoadingThread = false;
					});
				}
			},

			startNewConversation: (): string => {
				const id = uuidv4();
				set((state) => {
					state.conversations[id] = {
						id,
						messages: [],
						createdAt: Date.now(),
						updatedAt: Date.now(),
					};
					state.activeConversationId = id;
				});
				return id;
			},

			setActiveConversation: (id: string): void => {
				set((state) => {
					state.activeConversationId = id;
				});
			},

			clearConversation: (id: string): void => {
				disconnectAndCommit(id, set, get);
				set((state) => {
					if (state.conversations[id]) {
						state.conversations[id].messages
							.map((m) => m.id)
							.forEach((mid) => {
								delete state.answeredBlocks[mid];
							});
						state.conversations[id].messages = [];
						state.conversations[id].title = undefined;
						state.conversations[id].threadId = undefined;
						state.conversations[id].archived = false;
						state.conversations[id].updatedAt = Date.now();
					}
				});
			},

			archiveConversation: (id: string): void => {
				const conv = get().conversations[id];
				if (!conv) {
					return;
				}
				disconnectAndCommit(id, set, get);
				if (conv.threadId) {
					updateThread(conv.threadId, { archived: true }).catch((err) => {
						console.error('[AIAssistant] archiveThread failed:', err);
					});
					set((state) => {
						const c = state.conversations[id];
						if (c) {
							c.archived = true;
						}
						if (state.activeConversationId === id) {
							const remaining = Object.values(state.conversations)
								.filter((a) => !a.archived)
								.sort(
									(a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
								);
							state.activeConversationId = remaining[0]?.id ?? null;
						}
					});
				} else {
					set((state) => {
						delete state.conversations[id];
						if (state.activeConversationId === id) {
							const remaining = Object.values(state.conversations).sort(
								(a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
							);
							state.activeConversationId = remaining[0]?.id ?? null;
						}
					});
				}
			},

			restoreConversation: (id: string): void => {
				const conv = get().conversations[id];
				if (!conv?.threadId) {
					return;
				}
				updateThread(conv.threadId, { archived: false })
					.then(() => {
						set((state) => {
							const c = state.conversations[id];
							if (c) {
								c.archived = false;
							}
						});
					})
					.catch((err) => {
						console.error('[AIAssistant] restoreThread failed:', err);
					});
			},

			renameConversation: async (id: string, title: string): Promise<void> => {
				const trimmed = title.trim() || undefined;
				const conv = get().conversations[id];
				if (!conv) {
					return;
				}
				const previousTitle = conv.title;

				// Optimistic local update so the sidebar reflects the rename
				// immediately. Reconciled or reverted below once the backend
				// responds — without that, an in-flight `loadThread` /
				// `fetchThreads` can resolve with the pre-rename title and
				// clobber the optimistic value.
				set((state) => {
					if (state.conversations[id]) {
						state.conversations[id].title = trimmed;
					}
				});

				if (!conv.threadId) {
					return;
				}

				try {
					const updated = await updateThread(conv.threadId, {
						title: trimmed ?? null,
					});
					set((state) => {
						if (state.conversations[id]) {
							state.conversations[id].title = updated.title ?? undefined;
						}
					});
				} catch (err) {
					console.error('[AIAssistant] renameThread failed:', err);
					set((state) => {
						if (state.conversations[id]) {
							state.conversations[id].title = previousTitle;
						}
					});
				}
			},

			markBlockAnswered: (messageId: string, answer: string): void => {
				set((state) => {
					state.answeredBlocks[messageId] = answer;
				});
			},

			// eslint-disable-next-line sonarjs/cognitive-complexity
			sendMessage: async (
				text: string,
				attachments?: MessageAttachment[],
				contexts?: MessageContext[],
			): Promise<void> => {
				let convId = get().activeConversationId;
				if (!convId || !get().conversations[convId]) {
					return;
				}

				// If a previous reply is still streaming (typical when the user
				// clicks a suggested-action button before the assistant has
				// finished), tear it down before we queue the new one. We commit
				// any partial text as a message so it's not lost, then await
				// the backend cancel so `sendMessageToThread` doesn't race a
				// 409 "thread busy" against the still-active execution.
				const inFlight = get().streams[convId];
				if (inFlight?.isStreaming) {
					const existingThreadId = get().conversations[convId]?.threadId;
					disconnectAndCommit(convId, set, get);
					if (existingThreadId) {
						try {
							await cancelExecution(existingThreadId);
						} catch (err) {
							console.error('[AIAssistant] cancelExecution failed:', err);
						}
					}
				}

				const userMessage: Message = {
					id: uuidv4(),
					role: 'user',
					content: text,
					attachments,
					createdAt: Date.now(),
				};

				set((state) => {
					const conv = state.conversations[convId!];
					conv.messages.push(userMessage);
					conv.updatedAt = Date.now();
					if (!conv.title && text.trim()) {
						conv.title = deriveTitle(text);
					}
					resetStreamingState(state, convId!);
				});

				try {
					let { threadId } = get().conversations[convId];
					if (!threadId) {
						threadId = await createThread();
						// Re-key the conversation from client UUID to backend threadId
						// so fetchThreads won't create a duplicate entry later.
						const oldId = convId;
						convId = threadId;
						set((s) => {
							const conv = s.conversations[oldId];
							if (conv) {
								conv.id = convId!;
								conv.threadId = convId!;
								s.conversations[convId!] = conv;
								delete s.conversations[oldId];
								if (s.activeConversationId === oldId) {
									s.activeConversationId = convId!;
								}
								const stream = s.streams[oldId];
								if (stream) {
									s.streams[convId!] = stream;
									delete s.streams[oldId];
								}
							}
						});
					}
					const executionId = await sendMessageToThread(threadId, text, contexts);
					const ctrl = newStreamController(convId);
					await runStreamingLoop(executionId, {
						conversationId: convId,
						set,
						signal: ctrl.signal,
					});
					streamControllers.delete(convId);

					if (!hasPendingInput(convId, get)) {
						finalizeStreamingMessage(convId, set, get);
					}
				} catch (err) {
					// Abort errors are expected when the user cancels — not a failure
					if (err instanceof DOMException && err.name === 'AbortError') {
						return;
					}
					console.error('[AIAssistant] sendMessage failed:', err);
					const message =
						err instanceof SSEStreamError && err.status === 429
							? 'You sent that a bit too quickly. Please wait a moment and try again.'
							: 'Something went wrong while fetching the response. Please try again.';
					finalizeStreamingError(convId, message, set);
				}
			},

			approveAction: async (
				conversationId: string,
				approvalId: string,
			): Promise<void> => {
				set((s) => {
					const st = s.streams[conversationId];
					if (st) {
						st.pendingApproval = null;
						st.isStreaming = true;
						st.streamingStatus = 'resumed';
					} else {
						resetStreamingState(s, conversationId);
					}
				});

				try {
					const executionId = await approveExecution(approvalId);
					const ctrl = newStreamController(conversationId);
					await runStreamingLoop(executionId, {
						conversationId,
						set,
						signal: ctrl.signal,
					});
					streamControllers.delete(conversationId);
					if (!hasPendingInput(conversationId, get)) {
						finalizeStreamingMessage(conversationId, set, get);
					}
				} catch (err) {
					if (err instanceof DOMException && err.name === 'AbortError') {
						return;
					}
					console.error('[AIAssistant] approveAction failed:', err);
					finalizeStreamingError(
						conversationId,
						'Something went wrong while processing the approval. Please try again.',
						set,
					);
				}
			},

			rejectAction: async (
				conversationId: string,
				approvalId: string,
			): Promise<void> => {
				try {
					await rejectExecution(approvalId);
				} catch (err) {
					console.error('[AIAssistant] rejectAction failed:', err);
				}
				set((s) => {
					const st = s.streams[conversationId];
					if (st) {
						st.pendingApproval = null;
						st.streamingStatus = '';
						st.isStreaming = false;
					}
				});
			},

			cancelStream: (conversationId: string): void => {
				// 1. Abort the client-side SSE reader
				disconnectAndCommit(conversationId, set, get);

				// 2. Cancel the backend execution (fire-and-forget)
				const conv = get().conversations[conversationId];
				if (conv?.threadId) {
					cancelExecution(conv.threadId).catch((err) => {
						console.error('[AIAssistant] cancelExecution failed:', err);
					});
				}
			},

			regenerateAssistantMessage: async (
				conversationId: string,
				messageId: string,
			): Promise<void> => {
				const conv = get().conversations[conversationId];
				if (!conv) {
					return;
				}
				const targetIndex = conv.messages.findIndex((m) => m.id === messageId);
				if (targetIndex < 0) {
					return;
				}

				// The backend rewinds history up to (excluding) `messageId` and
				// kicks off a fresh execution. Mirror that locally so the
				// streaming bubble doesn't render alongside the stale reply
				// that's about to be replaced.
				set((s) => {
					const c = s.conversations[conversationId];
					if (c) {
						c.messages = c.messages.slice(0, targetIndex);
					}
					resetStreamingState(s, conversationId);
				});

				try {
					const executionId = await regenerateMessage(messageId);
					const ctrl = newStreamController(conversationId);
					await runStreamingLoop(executionId, {
						conversationId,
						set,
						signal: ctrl.signal,
					});
					streamControllers.delete(conversationId);
					if (!hasPendingInput(conversationId, get)) {
						finalizeStreamingMessage(conversationId, set, get);
					}
				} catch (err) {
					if (err instanceof DOMException && err.name === 'AbortError') {
						return;
					}
					console.error('[AIAssistant] regenerateAssistantMessage failed:', err);
					finalizeStreamingError(
						conversationId,
						'Something went wrong while regenerating the response. Please try again.',
						set,
					);
				}
			},

			submitMessageFeedback: async (
				messageId: string,
				rating: FeedbackRating,
				comment?: string,
			): Promise<void> => {
				const { activeConversationId } = get();
				if (!activeConversationId) {
					return;
				}

				set((s) => {
					const conv = s.conversations[activeConversationId];
					if (!conv) {
						return;
					}
					const msg = conv.messages.find((m) => m.id === messageId);
					if (msg) {
						msg.feedbackRating = rating;
					}
				});

				try {
					await submitFeedback(messageId, rating, comment);
				} catch (err) {
					console.error('[AIAssistant] submitMessageFeedback failed:', err);
				}
			},

			submitClarification: async (
				conversationId: string,
				clarificationId: string,
				answers: Record<string, unknown>,
			): Promise<void> => {
				set((s) => {
					const st = s.streams[conversationId];
					if (st) {
						st.pendingClarification = null;
						st.isStreaming = true;
						st.streamingStatus = 'resumed';
					} else {
						resetStreamingState(s, conversationId);
					}
				});

				try {
					const executionId = await clarifyExecution(clarificationId, answers);
					const ctrl = newStreamController(conversationId);
					await runStreamingLoop(executionId, {
						conversationId,
						set,
						signal: ctrl.signal,
					});
					streamControllers.delete(conversationId);
					if (!hasPendingInput(conversationId, get)) {
						finalizeStreamingMessage(conversationId, set, get);
					}
				} catch (err) {
					if (err instanceof DOMException && err.name === 'AbortError') {
						return;
					}
					console.error('[AIAssistant] submitClarification failed:', err);
					finalizeStreamingError(
						conversationId,
						'Something went wrong while processing your answers. Please try again.',
						set,
					);
				}
			},
		})),
		{
			name: 'ai-assistant-store',
			version: 3,
			partialize: (state) => ({
				isDrawerOpen: state.isDrawerOpen,
				answeredBlocks: state.answeredBlocks,
				// Persist the active conversation so a page reload returns the
				// user to the same thread instead of dumping them into a new one.
				activeConversationId: state.activeConversationId,
			}),
			migrate: () => ({
				isDrawerOpen: false,
				answeredBlocks: {},
				activeConversationId: null,
			}),
			onRehydrateStorage:
				() =>
				(state: any): void => {
					if (!state) {
						return;
					}

					// Restored an active conversation id: prime an empty entry so
					// the UI has something to render immediately, and flag the
					// store as loading so ConversationView shows a skeleton —
					// not an empty thread — while AppLayout's fetchThreads
					// catches up. Without this flag the user sees a flicker of
					// "empty conversation" before the skeleton appears.
					//
					// We can't call loadThread here — rehydrate fires at module
					// load, long before useIsAIAssistantEnabled has set the URL.
					if (state.activeConversationId) {
						const id = state.activeConversationId;
						if (!state.conversations[id]) {
							state.conversations[id] = {
								id,
								messages: [],
								createdAt: Date.now(),
								updatedAt: Date.now(),
								isHydrating: true,
							};
						} else {
							state.conversations[id].isHydrating = true;
						}
						state.isLoadingThreads = true;
						return;
					}

					if (state.isDrawerOpen || state.isModalOpen) {
						state.startNewConversation();
					}
				},
		},
	),
);

// Standalone imperative accessors
export const openAIAssistant = (): void =>
	useAIAssistantStore.getState().openDrawer();
export const closeAIAssistant = (): void =>
	useAIAssistantStore.getState().closeDrawer();
export const openAIAssistantModal = (): void =>
	useAIAssistantStore.getState().openModal();
export const closeAIAssistantModal = (): void =>
	useAIAssistantStore.getState().closeModal();
export const minimizeAIAssistantModal = (): void =>
	useAIAssistantStore.getState().minimizeModal();
