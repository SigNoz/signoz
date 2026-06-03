import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { useQueryClient } from 'react-query';
import cx from 'classnames';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@signozhq/ui/popover';
import { toast } from '@signozhq/ui/sonner';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import type { UploadFile } from 'antd';
import getSessionStorage from 'api/browser/sessionstorage/get';
import setSessionStorage from 'api/browser/sessionstorage/set';
import {
	getListRulesQueryKey,
	useListRules,
} from 'api/generated/services/rules';
import type { ListRules200 } from 'api/generated/services/sigNoz.schemas';
import logEvent from 'api/common/logEvent';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useGetAllDashboard } from 'hooks/dashboard/useGetAllDashboard';
import { useQueryService } from 'hooks/useQueryService';
import type { SuccessResponseV2 } from 'types/api';
import type { Dashboard } from 'types/api/dashboard/getAll';
// eslint-disable-next-line
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	AIAssistantEvents,
	VoiceInputSource,
	getBrowserInfo,
} from '../../events';
import { useAIAssistantAnalyticsContext } from '../../hooks/useAIAssistantAnalyticsContext';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { MessageAttachment } from '../../types';
import { MessageContext } from '../../../../api/ai-assistant/chat';
import {
	Bell,
	LayoutDashboard,
	Mic,
	Plus,
	Search,
	Send,
	ShieldCheck,
	Square,
	TriangleAlert,
	X,
} from '@signozhq/icons';

import styles from './ChatInput.module.scss';

interface ChatInputProps {
	onSend: (
		text: string,
		attachments?: MessageAttachment[],
		contexts?: MessageContext[],
	) => void;
	onCancel?: () => void;
	disabled?: boolean;
	isStreaming?: boolean;
	/**
	 * URL-derived `source: 'auto'` contexts representing the page the user is
	 * currently looking at. Rendered as chips alongside the user's `@`-mention
	 * picks and merged into the outgoing `contexts` array.
	 */
	autoContexts?: MessageContext[];
	/**
	 * Called when the user dismisses an auto-context chip. The parent owns
	 * the dismissed set and is responsible for filtering the next render's
	 * `autoContexts` to exclude the key.
	 */
	onDismissAutoContext?: (key: string) => void;
}

/** Stable identity for an auto-context entry — used as React key + dismissal id. */
export function autoContextKey(ctx: MessageContext): string {
	const page = (ctx.metadata as { page?: string } | null | undefined)?.page;
	return `auto:${ctx.type}:${ctx.resourceId ?? ''}:${page ?? ''}`;
}

/**
 * Friendly label for an auto-derived context chip. We don't fetch resource
 * names from the URL alone, so we lean on the page identity that already
 * lives in `metadata.page`, falling back to the resource type.
 */
function autoContextLabel(ctx: MessageContext): string {
	const page = (ctx.metadata as { page?: string } | null | undefined)?.page;
	switch (page) {
		case 'dashboard_detail':
			return 'Current dashboard';
		case 'panel_edit':
			return 'Editing panel';
		case 'panel_fullscreen':
			return 'Panel (fullscreen)';
		case 'dashboard_list':
			return 'Dashboards';
		case 'alert_edit':
			return 'Editing alert';
		case 'alert_new':
			return 'New alert';
		case 'alerts_triggered':
			return 'Triggered alerts';
		case 'alert_list':
			return 'Alerts';
		case 'service_detail':
			return 'Current service';
		case 'services_list':
			return 'Services';
		case 'logs_explorer':
			return 'Logs explorer';
		case 'log_detail':
			return 'Log details';
		case 'traces_explorer':
			return 'Traces explorer';
		case 'trace_detail':
			return 'Trace details';
		case 'metrics_explorer':
			return 'Metrics explorer';
		default:
			return ctx.type;
	}
}

/** Capitalised category badge text — e.g. "Dashboard", "Logs explorer". */
function autoContextCategory(ctx: MessageContext): string {
	switch (ctx.type) {
		case 'dashboard':
			return 'Dashboard';
		case 'alert':
			return 'Alert';
		case 'service':
			return 'Service';
		case 'logs_explorer':
			return 'Logs';
		case 'traces_explorer':
			return 'Traces';
		case 'metrics_explorer':
			return 'Metrics';
		case 'saved_view':
			return 'Saved view';
		default:
			return ctx.type;
	}
}

const MAX_INPUT_LENGTH = 20000;
const WARNING_THRESHOLD = 15000;
// Cap for the auto-growing composer. Past this, the textarea stops growing
// and starts scrolling internally so the message list above doesn't get
// squeezed in tighter container variants (e.g. the floating panel).
const TEXTAREA_MAX_HEIGHT_PX = 200;
const HOME_SERVICES_INTERVAL = 30 * 60 * 1000;
/** sessionStorage key for the "voice input failed this tab" flag. */
const VOICE_UNAVAILABLE_KEY = 'ai-assistant-voice-unavailable';

const CONTEXT_CATEGORIES = ['Dashboards', 'Alerts', 'Services'] as const;

type ContextCategory = (typeof CONTEXT_CATEGORIES)[number];

interface SelectedContextItem {
	category: ContextCategory;
	entityId: string;
	value: string;
}

function toMessageContext(item: SelectedContextItem): MessageContext | null {
	switch (item.category) {
		case 'Dashboards':
			return {
				source: 'mention',
				type: 'dashboard',
				resourceId: item.entityId,
				resourceName: item.value,
			};
		case 'Alerts':
			return {
				source: 'mention',
				type: 'alert',
				resourceId: item.entityId,
				resourceName: item.value,
			};
		case 'Services':
			return {
				source: 'mention',
				type: 'service',
				resourceId: item.entityId,
				resourceName: item.value,
			};
		default:
			return null;
	}
}

interface ContextEntityItem {
	id: string;
	value: string;
}

const CONTEXT_CATEGORY_ICONS = {
	Dashboards: LayoutDashboard,
	Alerts: Bell,
	Services: ShieldCheck,
} satisfies Record<ContextCategory, unknown>;

function fileToDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (): void => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

export default function ChatInput({
	onSend,
	onCancel,
	disabled,
	isStreaming = false,
	autoContexts,
	onDismissAutoContext,
}: ChatInputProps): JSX.Element {
	const { selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const [text, setText] = useState('');
	const [pendingFiles, setPendingFiles] = useState<UploadFile[]>([]);
	const [selectedContexts, setSelectedContexts] = useState<
		SelectedContextItem[]
	>([]);
	const [isContextPickerOpen, setIsContextPickerOpen] = useState(false);
	const [activeContextCategory, setActiveContextCategory] =
		useState<ContextCategory>('Dashboards');
	const [pickerSearchQuery, setPickerSearchQuery] = useState('');
	// Refs to each category tab so we can move DOM focus to the newly-active
	// tab on ArrowUp/ArrowDown. Without this the roving-tabindex pattern
	// stalls: focus stays on the original button (whose closure has the old
	// category), so subsequent arrow keys never advance past the second tab.
	const categoryTabRefs = useRef(
		new Map<ContextCategory, HTMLButtonElement | null>(),
	);
	// Refs to each entity row in the active tab panel, so we can cross from
	// the category tablist (ArrowRight) into the panel and step through
	// entities with ArrowUp/Down. Array is rewritten each render — there's
	// only ever one tab panel mounted so stale indices clear naturally.
	const entityRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const queryClient = useQueryClient();

	// When the picker was opened by typing `@` in the textarea, this holds the
	// span of `@<query>` (start / end indices into `text`). Used both for live
	// filtering of the entity list and for splicing the trigger out of the
	// text once the user picks an item. `null` when the picker is opened via
	// the "Add Context" button (no trigger to strip, no query to filter).
	const [mentionRange, setMentionRange] = useState<{
		start: number;
		end: number;
	} | null>(null);
	const [servicesTimeRange] = useState(() => {
		const now = Date.now();
		return {
			startTime: now - HOME_SERVICES_INTERVAL,
			endTime: now,
		};
	});
	// Stores the already-committed final text so interim results don't overwrite it
	const committedTextRef = useRef('');
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const inputRootRef = useRef<HTMLDivElement>(null);

	const capText = useCallback(
		(value: string) => value.slice(0, MAX_INPUT_LENGTH),
		[],
	);

	const syncContextPickerFromText = useCallback(
		(value: string, caret: number) => {
			const beforeCaret = value.slice(0, caret);
			const atIndex = beforeCaret.lastIndexOf('@');
			if (atIndex < 0) {
				setIsContextPickerOpen(false);
				setMentionRange(null);
				return;
			}
			const query = beforeCaret.slice(atIndex + 1);
			if (/\s/.test(query)) {
				setIsContextPickerOpen(false);
				setMentionRange(null);
				return;
			}
			setIsContextPickerOpen(true);
			setMentionRange({ start: atIndex, end: caret });
		},
		[],
	);

	const toggleContextSelection = useCallback(
		(category: ContextCategory, entityId: string, contextValue: string) => {
			const wasSelected = selectedContexts.some(
				(item) => item.category === category && item.entityId === entityId,
			);

			setSelectedContexts((prev) => {
				if (wasSelected) {
					return prev.filter(
						(item) => !(item.category === category && item.entityId === entityId),
					);
				}
				return [...prev, { category, entityId, value: contextValue }];
			});

			// When the user picks an item via the `@` trigger, splice the
			// `@<query>` span out of the textarea so their prose stays clean.
			// Skip on remove (no trigger to strip) and when the picker was
			// opened from the "Add Context" button (no mention range tracked).
			if (!wasSelected && mentionRange) {
				const next =
					text.slice(0, mentionRange.start) + text.slice(mentionRange.end);
				setText(next);
				committedTextRef.current = next;
				setMentionRange(null);
			}
		},
		[mentionRange, selectedContexts, text],
	);

	const focusCategory = useCallback((category: ContextCategory) => {
		setActiveContextCategory(category);
		setPickerSearchQuery('');
		categoryTabRefs.current.get(category)?.focus();
	}, []);

	const handleCategoryKeyDown = useCallback(
		(
			e: React.KeyboardEvent<HTMLButtonElement>,
			category: ContextCategory,
		): void => {
			const total = CONTEXT_CATEGORIES.length;
			const idx = CONTEXT_CATEGORIES.indexOf(category);
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				focusCategory(CONTEXT_CATEGORIES[(idx + 1) % total]);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				focusCategory(CONTEXT_CATEGORIES[(idx - 1 + total) % total]);
			} else if (e.key === 'Home') {
				e.preventDefault();
				focusCategory(CONTEXT_CATEGORIES[0]);
			} else if (e.key === 'End') {
				e.preventDefault();
				focusCategory(CONTEXT_CATEGORIES[total - 1]);
			} else if (e.key === 'ArrowRight') {
				// Cross from tablist into entity panel.
				e.preventDefault();
				entityRefs.current[0]?.focus();
			}
		},
		[focusCategory],
	);

	const handleEntityKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
			const count = entityRefs.current.length;
			if (count === 0) {
				return;
			}
			const focusAt = (i: number): void => {
				e.preventDefault();
				entityRefs.current[i]?.focus();
			};
			switch (e.key) {
				case 'ArrowDown':
					focusAt((index + 1) % count);
					break;
				case 'ArrowUp':
					focusAt((index - 1 + count) % count);
					break;
				case 'Home':
					focusAt(0);
					break;
				case 'End':
					focusAt(count - 1);
					break;
				case 'ArrowLeft':
					// Cross back to tablist.
					e.preventDefault();
					categoryTabRefs.current.get(activeContextCategory)?.focus();
					break;
				default:
			}
		},
		[activeContextCategory],
	);

	// Focus the textarea when this component mounts (panel/modal open)
	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	// Auto-grow the textarea so long prompts aren't trapped in a 2-line
	// scrolling porthole. Reset to `auto` first to let the field shrink back
	// down when the user deletes content, then snap to scrollHeight capped at
	// TEXTAREA_MAX_HEIGHT_PX (overflow-y: auto in CSS handles the rest).
	useLayoutEffect(() => {
		const el = textareaRef.current;
		if (!el) {
			return;
		}
		el.style.height = 'auto';
		el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
	}, [text]);

	const handleSend = useCallback(async () => {
		const trimmed = text.trim();
		if (!trimmed && pendingFiles.length === 0) {
			return;
		}

		const attachments: MessageAttachment[] = await Promise.all(
			pendingFiles.map(async (f) => {
				const dataUrl = f.originFileObj ? await fileToDataUrl(f.originFileObj) : '';
				return {
					name: f.name,
					type: f.type ?? 'application/octet-stream',
					dataUrl,
				};
			}),
		);

		const userContexts = selectedContexts
			.map(toMessageContext)
			.filter((context): context is MessageContext => context !== null);
		// Auto contexts come first so the agent reads "current page" before
		// any explicit @-mentions when both are present.
		const contexts = [...(autoContexts ?? []), ...userContexts];
		const payload = capText(trimmed);

		onSend(
			payload,
			attachments.length > 0 ? attachments : undefined,
			contexts.length > 0 ? contexts : undefined,
		);
		setText('');
		committedTextRef.current = '';
		setPendingFiles([]);
		setSelectedContexts([]);
		textareaRef.current?.focus();
	}, [text, pendingFiles, onSend, selectedContexts, autoContexts, capText]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Escape' && isContextPickerOpen) {
				setIsContextPickerOpen(false);
				return;
			}
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				void handleSend();
			}
		},
		[handleSend, isContextPickerOpen],
	);

	const removeFile = useCallback((uid: string) => {
		setPendingFiles((prev) => prev.filter((f) => f.uid !== uid));
	}, []);

	const removeContext = useCallback(
		(category: ContextCategory, entityId: string) => {
			setSelectedContexts((prev) =>
				prev.filter(
					(item) => !(item.category === category && item.entityId === entityId),
				),
			);
		},
		[],
	);

	// ── Voice input ────────────────────────────────────────────────────────────

	const analyticsCtx = useAIAssistantAnalyticsContext();
	// Captured at the start of a voice session, consumed when it ends.
	// Tracks both the trigger (button vs. PTT shortcut) and the wall-clock
	// start time so we can attribute `durationMs` on the Voice input used
	// event regardless of which control ended the session.
	const voiceStartedAtRef = useRef<number | null>(null);
	const voiceSourceRef = useRef<VoiceInputSource | null>(null);
	// Set to true after a `network`, `not-allowed`, or `not-supported` failure
	// so we hide the mic button for the rest of the tab session — silent
	// retries don't help, and Chromium derivatives without the Google Speech
	// API key always fail with `network` no matter how many times the user
	// clicks. Persisted to sessionStorage so a page reload doesn't surface the
	// button again (closing the tab still resets, in case the user fixed
	// permissions or switched browsers).
	const [voiceUnavailable, setVoiceUnavailable] = useState(
		() => getSessionStorage(VOICE_UNAVAILABLE_KEY) === 'true',
	);
	const markVoiceUnavailable = useCallback((): void => {
		setVoiceUnavailable(true);
		setSessionStorage(VOICE_UNAVAILABLE_KEY, 'true');
	}, []);

	const {
		isListening,
		isSupported,
		permission: micPermission,
		start,
		discard,
	} = useSpeechRecognition({
		onTranscript: (transcriptText, isFinal) => {
			if (isFinal) {
				// Commit: append to whatever the user has already typed
				const separator = committedTextRef.current ? ' ' : '';
				const next = capText(committedTextRef.current + separator + transcriptText);
				committedTextRef.current = next;
				setText(next);
			} else {
				// Interim: live preview appended to committed text, not yet persisted
				const separator = committedTextRef.current ? ' ' : '';
				setText(capText(committedTextRef.current + separator + transcriptText));
			}
		},
		onError: (error) => {
			// Guard against double-fire: Chrome can fire `onerror` more than
			// once per session when `continuous = true` (it retries internally
			// before giving up). Only fire the analytics event for the first
			// error in a given session — voiceSourceRef being null means we've
			// already handled it.
			const source = voiceSourceRef.current;
			if (source === null) {
				return;
			}
			voiceStartedAtRef.current = null;
			voiceSourceRef.current = null;
			void logEvent(AIAssistantEvents.VoiceInputFailed, {
				...analyticsCtx,
				...getBrowserInfo(),
				source,
				errorType: error,
			});
			if (error === 'network') {
				markVoiceUnavailable();
				toast.error('Voice input unavailable in this browser', {
					description:
						'This browser cannot reach the speech recognition service. Try Google Chrome or Microsoft Edge.',
				});
			} else if (error === 'not-allowed') {
				markVoiceUnavailable();
				toast.error('Microphone access denied', {
					description:
						'Grant microphone permission in your browser settings to use voice input.',
				});
			} else if (error === 'not-supported') {
				markVoiceUnavailable();
				toast.error('Voice input is not supported in this browser.');
			}
			// `no-speech` is benign (just silence) — don't toast or hide.
		},
	});

	const showMic = isSupported && micPermission !== 'denied' && !voiceUnavailable;

	const startVoiceInput = useCallback(
		(source: VoiceInputSource) => {
			// Defense in depth: the button is hidden when `voiceUnavailable` is
			// true, but the PTT shortcut listener can still call us. Bailing here
			// keeps a single source of truth and prevents repeat `Voice input
			// failed` events in the same session.
			if (voiceUnavailable) {
				return;
			}
			voiceStartedAtRef.current = Date.now();
			voiceSourceRef.current = source;
			start();
		},
		[start, voiceUnavailable],
	);

	const fireVoiceInputEvent = useCallback(
		(outcome: 'sent' | 'discarded') => {
			const startedAt = voiceStartedAtRef.current;
			const source = voiceSourceRef.current;
			voiceStartedAtRef.current = null;
			voiceSourceRef.current = null;
			if (startedAt === null || source === null) {
				return;
			}
			void logEvent(AIAssistantEvents.VoiceInputUsed, {
				...analyticsCtx,
				...getBrowserInfo(),
				source,
				outcome,
				durationMs: Date.now() - startedAt,
			});
		},
		[analyticsCtx],
	);

	// Stop recording and immediately send whatever is in the textarea.
	const handleStopAndSend = useCallback(async () => {
		// Promote the displayed text (interim included) to committed so handleSend sees it.
		committedTextRef.current = capText(text);
		// Stop recognition without triggering onTranscript again (would double-append).
		discard();
		fireVoiceInputEvent('sent');
		await handleSend();
	}, [text, discard, handleSend, capText, fireVoiceInputEvent]);

	// Stop recording and revert the textarea to what it was before voice started.
	const handleDiscard = useCallback(() => {
		discard();
		fireVoiceInputEvent('discarded');
		setText(committedTextRef.current);
		textareaRef.current?.focus();
	}, [discard, fireVoiceInputEvent]);

	// ── Push-to-talk (Cmd/Ctrl + Shift + Space) ────────────────────────────────
	// Hold the combo to record; release Space to submit. We track which key
	// triggered PTT in a ref so a late-released modifier (Cmd/Shift) doesn't
	// accidentally stop the session. Auto-repeat is suppressed via a
	// "session active" ref so a held key only calls `start()` once.
	const pttActiveRef = useRef(false);
	useEffect(() => {
		if (!isSupported || micPermission === 'denied' || voiceUnavailable) {
			return undefined;
		}

		const handleKeyDown = (e: KeyboardEvent): void => {
			const isComboKey =
				(e.metaKey || e.ctrlKey) &&
				e.shiftKey &&
				(e.code === 'Space' || e.key === ' ');
			if (!isComboKey || disabled || isStreaming) {
				return;
			}
			e.preventDefault();
			if (pttActiveRef.current) {
				return; // ignore auto-repeat
			}
			pttActiveRef.current = true;
			startVoiceInput(VoiceInputSource.Shortcut);
		};

		const handleKeyUp = (e: KeyboardEvent): void => {
			if (!pttActiveRef.current) {
				return;
			}
			// End on the *first* released key in the combo. macOS browsers
			// frequently swallow keyup of regular keys (incl. Space) while
			// Cmd is held, so we can't rely on Space-up alone — releasing
			// Cmd/Ctrl/Shift must also stop the session.
			const isComboKey =
				e.code === 'Space' ||
				e.key === ' ' ||
				e.key === 'Meta' ||
				e.key === 'Control' ||
				e.key === 'Shift';
			if (!isComboKey) {
				return;
			}
			pttActiveRef.current = false;
			e.preventDefault();
			void handleStopAndSend();
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return (): void => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, [
		isSupported,
		micPermission,
		voiceUnavailable,
		disabled,
		isStreaming,
		startVoiceInput,
		handleStopAndSend,
	]);

	// Each list hook fetches only when its picker tab is actively shown,
	// AND treats already-cached data as never stale (`staleTime: Infinity`)
	// so an open with a populated cache doesn't trigger a background
	// refetch. Net effect: assistant-driven fetches happen exactly once
	// per resource list per session, on the first cache miss. Gating on
	// `isContextPickerOpen` (not just `activeContextCategory`) is important
	// — the latter defaults to 'Dashboards' on every mount, so without the
	// picker-open check the dashboards list refetches on every new
	// conversation.
	const {
		data: dashboardsResponse,
		isLoading: isDashboardsLoading,
		isError: isDashboardsError,
	} = useGetAllDashboard({
		enabled: isContextPickerOpen && activeContextCategory === 'Dashboards',
		staleTime: Infinity,
	});

	const {
		data: alertsResponse,
		isLoading: isAlertsLoading,
		isError: isAlertsError,
	} = useListRules({
		query: {
			enabled: isContextPickerOpen && activeContextCategory === 'Alerts',
			staleTime: Infinity,
		},
	});

	const {
		data: servicesResponse,
		isLoading: isServicesLoading,
		isFetching: isServicesFetching,
		isError: isServicesError,
	} = useQueryService({
		minTime: servicesTimeRange.startTime * 1e6,
		maxTime: servicesTimeRange.endTime * 1e6,
		selectedTime,
		selectedTags: [],
		options: {
			enabled: isContextPickerOpen && activeContextCategory === 'Services',
			staleTime: Infinity,
		},
	});

	/**
	 * Resolves an auto-context to a human label: dashboard title, alert name,
	 * service name (the service `resourceId` IS the name), or a generic page
	 * label as fallback while the lookup data is still loading.
	 *
	 * Reads passively from the React Query cache via `getQueryData` —
	 * never triggers a fetch. If the cache is empty (e.g. assistant opened
	 * on a page that hasn't loaded the resource list yet), the chip falls
	 * back to a generic label and resolves once the cache fills via the
	 * picker or another page.
	 */
	const resolveAutoContextName = useCallback(
		(ctx: MessageContext): string => {
			if (ctx.type === 'service' && ctx.resourceId) {
				return ctx.resourceId;
			}
			if (ctx.type === 'dashboard' && ctx.resourceId) {
				const cached = queryClient.getQueryData<SuccessResponseV2<Dashboard[]>>(
					REACT_QUERY_KEY.GET_ALL_DASHBOARDS,
				);
				const dash = cached?.data?.find((d) => d.id === ctx.resourceId);
				if (dash?.data.title) {
					return dash.data.title;
				}
			}
			if (ctx.type === 'alert' && ctx.resourceId) {
				const cached = queryClient.getQueryData<ListRules200>(
					getListRulesQueryKey(),
				);
				const rule = cached?.data?.find((r) => r.id === ctx.resourceId);
				if (rule?.alert) {
					return rule.alert;
				}
			}
			const page = (
				ctx.metadata as { page?: string; traceId?: string } | null | undefined
			)?.page;
			if (page === 'trace_detail') {
				const traceId = (ctx.metadata as { traceId?: string } | null | undefined)
					?.traceId;
				if (traceId) {
					return `${traceId.slice(0, 8)}…`;
				}
			}
			return autoContextLabel(ctx);
		},
		[queryClient],
	);

	const contextEntitiesByCategory: Record<ContextCategory, ContextEntityItem[]> =
		{
			Dashboards:
				dashboardsResponse?.data?.map((dashboard) => ({
					id: dashboard.id,
					value: dashboard.data.title ?? 'Untitled',
				})) ?? [],
			Alerts:
				alertsResponse?.data
					?.filter((alertRule) => Boolean(alertRule.alert))
					.map((alertRule) => ({
						id: alertRule.id,
						value: alertRule.alert,
					})) ?? [],
			Services:
				servicesResponse
					?.filter((serviceItem) => Boolean(serviceItem.serviceName))
					.map((serviceItem, index) => ({
						id: serviceItem.serviceName || `service-${index}`,
						value: serviceItem.serviceName,
					})) ?? [],
		};

	const contextCategoryStateByCategory: Record<
		ContextCategory,
		{ isLoading: boolean; isError: boolean }
	> = {
		Dashboards: {
			isLoading: isDashboardsLoading,
			isError: isDashboardsError,
		},
		Alerts: {
			isLoading: isAlertsLoading,
			isError: isAlertsError,
		},
		Services: {
			isLoading: isServicesLoading || isServicesFetching,
			isError: isServicesError,
		},
	};

	// Type-ahead filter against the `@<query>` typed in the textarea. When
	// the picker was opened from the "Add Context" button there's no
	// mention query, so fall back to the in-popover search input.
	const mentionQuery = mentionRange
		? text.slice(mentionRange.start + 1, mentionRange.end).toLowerCase()
		: '';
	const activeQuery = mentionQuery || pickerSearchQuery.trim().toLowerCase();
	const filteredContextOptions = activeQuery
		? contextEntitiesByCategory[activeContextCategory].filter((entity) =>
				entity.value.toLowerCase().includes(activeQuery),
			)
		: contextEntitiesByCategory[activeContextCategory];
	// Truncate the ref array to match the current entity count so that
	// switching from a large category (e.g. 100 dashboards) to a smaller one
	// doesn't leave stale `null` slots from earlier renders. Keyboard nav math
	// already uses `filteredContextOptions.length` for the modulo, so stale
	// slots wouldn't be reached — this is purely housekeeping.
	entityRefs.current.length = filteredContextOptions.length;
	const { isLoading: isActiveContextLoading, isError: isActiveContextError } =
		contextCategoryStateByCategory[activeContextCategory];
	const currentLength = text.length;
	const showTextWarning = currentLength >= WARNING_THRESHOLD;

	return (
		<div className={styles.input} ref={inputRootRef}>
			{pendingFiles.length > 0 && (
				<div className={styles.attachments}>
					{pendingFiles.map((f) => (
						<div key={f.uid} className={styles.attachmentChip}>
							<span className={styles.attachmentName}>{f.name}</span>
							<Button
								variant="ghost"
								size="icon"
								className={styles.attachmentRemove}
								onClick={(): void => removeFile(f.uid)}
								aria-label={`Remove ${f.name}`}
							>
								<X size={11} />
							</Button>
						</div>
					))}
				</div>
			)}

			{(selectedContexts.length > 0 ||
				(autoContexts && autoContexts.length > 0)) && (
				<div className={styles.contextTags}>
					{autoContexts?.map((ctx) => {
						const key = autoContextKey(ctx);
						const label = resolveAutoContextName(ctx);
						const category = autoContextCategory(ctx);
						return (
							<div key={key} className={cx(styles.contextTag, styles.auto)}>
								<div className={styles.contextTagContent}>
									<Badge
										color="secondary"
										variant="outline"
										className={styles.contextTagCategory}
									>
										{category}
									</Badge>
									<span className={styles.contextTagLabel}>{label}</span>
								</div>
								{onDismissAutoContext && (
									<Button
										variant="link"
										size="icon"
										color="secondary"
										className={styles.contextTagRemove}
										onClick={(): void => onDismissAutoContext(key)}
										aria-label={`Remove ${category}: ${label} context`}
										prefix={<X size={10} />}
									></Button>
								)}
							</div>
						);
					})}
					{selectedContexts.map((contextItem) => (
						<div
							key={`${contextItem.category}:${contextItem.entityId}`}
							className={styles.contextTag}
						>
							<div className={styles.contextTagContent}>
								<Badge
									color="primary"
									variant="outline"
									className={styles.contextTagCategory}
								>
									{contextItem.category}
								</Badge>
								<span className={styles.contextTagLabel}>{contextItem.value}</span>
							</div>
							<Button
								variant="link"
								size="icon"
								color="secondary"
								className={styles.contextTagRemove}
								onClick={(): void =>
									removeContext(contextItem.category, contextItem.entityId)
								}
								aria-label={`Remove ${contextItem.category}: ${contextItem.value} context`}
								prefix={<X size={10} />}
							></Button>
						</div>
					))}
				</div>
			)}

			<div className={styles.composer}>
				<textarea
					ref={textareaRef}
					className={styles.textarea}
					placeholder="Ask anything… (Shift+Enter for new line)"
					value={text}
					onChange={(e): void => {
						const next = capText(e.target.value);
						setText(next);
						// Keep committed text in sync when the user edits manually
						committedTextRef.current = next;
						syncContextPickerFromText(next, e.target.selectionStart ?? next.length);
					}}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					maxLength={MAX_INPUT_LENGTH}
					rows={3}
				/>
			</div>
			{showTextWarning && (
				<div className={styles.charWarning} role="status">
					<TriangleAlert size={12} />
					<span>
						{currentLength}/{MAX_INPUT_LENGTH} characters. Limit is {MAX_INPUT_LENGTH}
						.
					</span>
				</div>
			)}

			<div className={styles.footer}>
				<div className={styles.leftActions}>
					<Popover
						open={isContextPickerOpen}
						onOpenChange={(open): void => {
							setIsContextPickerOpen(open);
							if (!open) {
								setActiveContextCategory('Dashboards');
								setPickerSearchQuery('');
							}
						}}
					>
						<PopoverTrigger asChild>
							<Button
								variant="solid"
								color="secondary"
								size="sm"
								disabled={disabled}
								onClick={(): void => {
									setActiveContextCategory('Dashboards');
									setPickerSearchQuery('');
								}}
								prefix={<Plus size={10} />}
							>
								Add Context
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className={styles.contextPopover}
							side="top"
							align="end"
							sideOffset={8}
						>
							<div className={styles.contextPopoverContent}>
								<div
									className={styles.contextPopoverCategories}
									role="tablist"
									aria-orientation="vertical"
									aria-label="Context categories"
								>
									{CONTEXT_CATEGORIES.map((category) => {
										const CategoryIcon = CONTEXT_CATEGORY_ICONS[category];
										const isActive = activeContextCategory === category;
										return (
											<Button
												key={category}
												ref={(el): void => {
													categoryTabRefs.current.set(category, el);
												}}
												type="button"
												variant="ghost"
												color="secondary"
												size="sm"
												role="tab"
												id={`ai-context-tab-${category}`}
												// Single stable panel id shared by every tab: only the
												// active category's tabpanel is rendered, so per-category
												// `aria-controls` ids would point at nonexistent nodes
												// for the two inactive tabs. APG allows a single
												// dynamic panel whose `aria-labelledby` swaps to the
												// active tab.
												aria-controls="ai-context-tabpanel"
												// Roving tabindex: only the active tab participates in
												// the Tab sequence; arrow keys move between tabs.
												tabIndex={isActive ? 0 : -1}
												aria-selected={isActive}
												className={cx(styles.contextPopoverCategoryItem, {
													[styles.active]: isActive,
												})}
												onClick={(): void => {
													setActiveContextCategory(category);
													setPickerSearchQuery('');
												}}
												onKeyDown={(e): void => handleCategoryKeyDown(e, category)}
												prefix={<CategoryIcon size={13} />}
											>
												<span>{category}</span>
											</Button>
										);
									})}
								</div>

								<div
									className={styles.contextPopoverRight}
									role="tabpanel"
									id="ai-context-tabpanel"
									aria-labelledby={`ai-context-tab-${activeContextCategory}`}
								>
									<div className={styles.contextPopoverSearch}>
										<Input
											type="text"
											placeholder={`Search ${activeContextCategory.toLowerCase()}…`}
											className={styles.contextPopoverSearchInput}
											value={pickerSearchQuery}
											onChange={(e): void => setPickerSearchQuery(e.target.value)}
											prefix={<Search size={12} />}
											// Skip the picker's roving keyboard focus — typing here
											// shouldn't move category selection.
											onKeyDown={(e): void => {
												e.stopPropagation();
											}}
										/>
									</div>
									<div className={styles.contextPopoverEntities}>
										{isActiveContextLoading ? (
											<div className={styles.contextPopoverEmpty}>
												Loading {activeContextCategory.toLowerCase()}...
											</div>
										) : isActiveContextError ? (
											<div className={styles.contextPopoverEmpty}>
												Failed to load {activeContextCategory.toLowerCase()}.
											</div>
										) : filteredContextOptions.length === 0 ? (
											<div className={styles.contextPopoverEmpty}>
												No matching entities
											</div>
										) : (
											filteredContextOptions.map((option, index) => {
												const isSelected = selectedContexts.some(
													(item) =>
														item.category === activeContextCategory &&
														item.entityId === option.id,
												);

												return (
													<Button
														key={option.id}
														ref={(el): void => {
															entityRefs.current[index] = el;
														}}
														type="button"
														variant="ghost"
														color="secondary"
														size="sm"
														aria-pressed={isSelected}
														className={cx(styles.contextPopoverEntityItem, {
															[styles.selected]: isSelected,
														})}
														onClick={(): void =>
															toggleContextSelection(
																activeContextCategory,
																option.id,
																option.value,
															)
														}
														onKeyDown={(e): void => handleEntityKeyDown(e, index)}
													>
														<span className={styles.contextPopoverEntityItemText}>
															{option.value}
														</span>
													</Button>
												);
											})
										)}
									</div>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				</div>

				<div className={styles.rightActions}>
					{showMic &&
						(isListening ? (
							<div
								className={styles.micRecording}
								role="status"
								aria-live="polite"
								aria-label="Recording voice input"
							>
								<TooltipSimple title="Discard recording">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										color="secondary"
										className={cx(styles.micDiscard, styles.secondary)}
										onClick={handleDiscard}
										aria-label="Discard recording"
										prefix={<X size={12} />}
									/>
								</TooltipSimple>
								<span className={styles.micWaves} aria-hidden="true">
									<span />
									<span />
									<span />
									<span />
									<span />
									<span />
									<span />
									<span />
								</span>
								<TooltipSimple title="Stop and send">
									<Button
										type="button"
										variant="ghost"
										size="icon"
										color="destructive"
										className={cx(styles.micStop, styles.destructive)}
										onClick={handleStopAndSend}
										aria-label="Stop and send"
										prefix={<Square size={9} fill="currentColor" strokeWidth={0} />}
									/>
								</TooltipSimple>
							</div>
						) : (
							<TooltipSimple title="Voice input">
								<Button
									variant="ghost"
									size="icon"
									onClick={(): void => startVoiceInput(VoiceInputSource.Button)}
									disabled={disabled}
									aria-label="Start voice input"
									className={styles.micBtn}
									prefix={<Mic size={14} />}
								/>
							</TooltipSimple>
						))}

					{isStreaming && onCancel ? (
						<TooltipSimple title="Stop generating">
							<Button
								variant="solid"
								size="icon"
								color="destructive"
								onClick={onCancel}
								aria-label="Stop generating"
								prefix={<Square size={10} fill="currentColor" strokeWidth={0} />}
							/>
						</TooltipSimple>
					) : (
						<TooltipSimple title="Send message">
							<Button
								variant="solid"
								size="icon"
								color="primary"
								onClick={isListening ? handleStopAndSend : handleSend}
								disabled={disabled || (!text.trim() && pendingFiles.length === 0)}
								aria-label="Send message"
								prefix={<Send size={14} />}
							/>
						</TooltipSimple>
					)}
				</div>
			</div>
		</div>
	);
}
