const TIME_AGGREGATIONS = ["latest", "sum", "avg", "min", "max", "count", "count_distinct", "rate", "increase"];
const SPACE_AGGREGATIONS = ["sum", "avg", "min", "max", "count"];

// the types whose samples reach the reader as plain values, so a bucket axis has
// to be chosen for them
const VALUE_TYPES = new Set(["gauge", "sum", "summary"]);

// single hue, dark to light: a count's magnitude is the only thing it encodes
const RAMP = ["#1c3557", "#22406c", "#284c82", "#2e5998", "#3668ae", "#4a80c4", "#689dd6", "#8dbbe6", "#b9d8f5"];
const ZERO_FILL = "#0e1016";

const PAD = { left: 78, right: 8, top: 8, bottom: 22 };
const MAX_CHART_HEIGHT = 560;
const MAX_JSON_CHARS = 300_000;

const state = {
	mode: "metric",
	rows: [],
	groupBy: [],
	bucketKind: "default",
	colorScale: "linear",
	grid: null,
	emptyReason: "Run a query to draw the heatmap.",
	hidden: new Set(),
	requestText: "",
	responseText: "",
};

const catalogue = new Map();
const attributesByMetric = new Map();
let nextRowId = 0;

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function timeWindow() {
	const end = Date.now();
	return { start: end - Number($("#range").value) * 60_000, end };
}

function rowLetter(index) {
	return String.fromCharCode(65 + index);
}

function typeSupport(type) {
	if (VALUE_TYPES.has(type)) {
		return { aggregations: true, buckets: true };
	}
	if (type === "histogram") {
		return { aggregations: false, buckets: false, note: "Read with increase/sum over its own le labels. Bucket options are rejected." };
	}
	if (type === "exponentialhistogram") {
		return { aggregations: false, buckets: false, bad: true, note: "Exponential histograms are not supported yet — this comes back 501." };
	}
	return { aggregations: false, buckets: false, bad: true, note: "No type is recorded for this metric, so no bucket axis can be chosen — this comes back 400." };
}

function scaleHint(scale) {
	const perTwice = 2 ** scale;
	return perTwice >= 1 ? `${perTwice} bucket${perTwice === 1 ? "" : "s"} per 2x` : `1 bucket per ${2 ** -scale}x`;
}

function formatNumber(value) {
	if (!Number.isFinite(value)) {
		return value > 0 ? "∞" : "-∞";
	}
	if (value === 0) {
		return "0";
	}
	const magnitude = Math.abs(value);
	if (magnitude >= 1e6 || magnitude < 1e-3) {
		return value.toExponential(1).replace("e+", "e");
	}
	if (Number.isInteger(value)) {
		return String(value);
	}
	const text = value.toPrecision(magnitude >= 1 ? 4 : 3);
	return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}

function formatTime(ms, spanMs) {
	const at = new Date(ms);
	const clock = at.toTimeString().slice(0, 5);
	return spanMs > 24 * 3600_000 ? `${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")} ${clock}` : clock;
}

/* ---------- upstream ---------- */

async function getJSON(path, params) {
	const response = await fetch(`${path}?${new URLSearchParams(params)}`);
	if (!response.ok) {
		throw new Error(`${path} came back ${response.status}: ${(await response.text()).slice(0, 400)}`);
	}
	return response.json();
}

async function searchMetrics(searchText) {
	const { start, end } = timeWindow();
	const body = await getJSON("/api/v2/metrics", { start, end, limit: 60, searchText });
	const metrics = body?.data?.metrics ?? [];
	for (const metric of metrics) {
		catalogue.set(metric.metricName, metric);
	}
	return metrics;
}

async function metricAttributes(metricName) {
	if (attributesByMetric.has(metricName)) {
		return attributesByMetric.get(metricName);
	}
	const { start, end } = timeWindow();
	const body = await getJSON("/api/v2/metrics/attributes", { metricName, start, end });
	const keys = (body?.data?.attributes ?? []).map((attribute) => attribute.key);
	attributesByMetric.set(metricName, keys);
	return keys;
}

/* ---------- metric rows ---------- */

function addRow() {
	state.rows.push({ id: nextRowId++, metric: "", type: "", timeAggregation: "max", spaceAggregation: "max", filter: "" });
	renderRows();
}

function renderRows() {
	const host = $("#rows");
	host.textContent = "";

	state.rows.forEach((row, index) => {
		const node = $("#row-template").content.firstElementChild.cloneNode(true);
		const input = node.querySelector(".metric-input");
		const list = node.querySelector("datalist");
		const badge = node.querySelector(".badge");
		const aggregations = node.querySelector(".agg-fields");
		const note = node.querySelector(".row-note");
		const listId = `metrics-${row.id}`;

		node.querySelector(".row-name").textContent = rowLetter(index);
		list.id = listId;
		input.setAttribute("list", listId);
		input.value = row.metric;
		node.querySelector(".filter-input").value = row.filter;
		node.querySelector(".remove-row").hidden = state.mode !== "formula" || state.rows.length < 2;

		const support = typeSupport(row.type);
		if (row.metric) {
			badge.hidden = false;
			badge.textContent = row.type || "no type";
			badge.classList.toggle("bad", Boolean(support.bad));
			aggregations.hidden = !support.aggregations;
			note.hidden = !support.note;
			note.textContent = support.note ?? "";
			note.classList.toggle("warn", Boolean(support.bad));
		}

		for (const [select, options, chosen] of [
			[node.querySelector(".time-agg"), TIME_AGGREGATIONS, row.timeAggregation],
			[node.querySelector(".space-agg"), SPACE_AGGREGATIONS, row.spaceAggregation],
		]) {
			select.innerHTML = options.map((option) => `<option value="${option}"${option === chosen ? " selected" : ""}>${option}</option>`).join("");
		}

		const fillOptions = async () => {
			try {
				const metrics = await searchMetrics(input.value.trim());
				list.innerHTML = metrics.map((metric) => `<option value="${esc(metric.metricName)}" label="${esc(metric.type || "no type")}"></option>`).join("");
			} catch (error) {
				showBanner(error.message);
			}
		};

		let searchTimer = 0;
		input.addEventListener("input", () => {
			clearTimeout(searchTimer);
			searchTimer = setTimeout(fillOptions, 220);
		});
		input.addEventListener("focus", () => {
			if (!list.children.length) {
				fillOptions();
			}
		});

		input.addEventListener("change", async () => {
			const name = input.value.trim();
			row.metric = name;
			row.type = catalogue.get(name)?.type ?? "";
			if (name && !catalogue.has(name)) {
				try {
					await searchMetrics(name);
					row.type = catalogue.get(name)?.type ?? "";
				} catch (error) {
					showBanner(error.message);
				}
			}
			renderRows();
			refreshPanes();
			refreshGroupOptions();
		});

		node.querySelector(".time-agg").addEventListener("change", (event) => {
			row.timeAggregation = event.target.value;
		});
		node.querySelector(".space-agg").addEventListener("change", (event) => {
			row.spaceAggregation = event.target.value;
		});
		node.querySelector(".filter-input").addEventListener("change", (event) => {
			row.filter = event.target.value.trim();
		});
		node.querySelector(".remove-row").addEventListener("click", () => {
			state.rows = state.rows.filter((candidate) => candidate.id !== row.id);
			renderRows();
			refreshPanes();
			refreshGroupOptions();
		});

		host.append(node);
	});
}

/* ---------- group by ---------- */

function renderGroupChips() {
	$("#group-chips").innerHTML = state.groupBy
		.map((key) => `<span class="chip">${esc(key)}<button type="button" data-key="${esc(key)}" title="Remove">&times;</button></span>`)
		.join("");
}

async function refreshGroupOptions() {
	const metrics = state.rows.map((row) => row.metric).filter(Boolean);
	const hint = $("#group-hint");
	if (!metrics.length) {
		$("#group-options").innerHTML = "";
		hint.hidden = false;
		hint.textContent = "Pick a metric to load its attributes.";
		return;
	}

	try {
		const keys = new Set();
		for (const row of state.rows.filter((candidate) => candidate.metric)) {
			for (const key of await metricAttributes(row.metric)) {
				// the builder strips `le` from a histogram's group by and reads the
				// bucket axis off it instead, so offering it here would do nothing
				if (key !== "le" || row.type !== "histogram") {
					keys.add(key);
				}
			}
		}
		const available = [...keys].filter((key) => !state.groupBy.includes(key)).sort();
		$("#group-options").innerHTML = available.map((key) => `<option value="${esc(key)}"></option>`).join("");
		hint.hidden = available.length > 0;
		hint.textContent = available.length ? "" : "No further attributes on the selected metrics in this window.";
	} catch (error) {
		showBanner(error.message);
	}
}

/* ---------- panes ---------- */

// A formula is bucketed from its own output, so its inputs may be any type. In
// metric mode the one metric decides, and an unpicked one keeps the pane up.
function bucketsAllowed() {
	if (state.mode === "promql") {
		return false;
	}
	if (state.mode === "formula") {
		return true;
	}
	const row = state.rows[0];
	return !row?.metric || typeSupport(row.type).buckets;
}

function refreshPanes() {
	const isPromql = state.mode === "promql";
	const isFormula = state.mode === "formula";

	$("#builder-pane").hidden = isPromql;
	$("#promql-pane").hidden = !isPromql;
	$("#add-row").hidden = !isFormula;
	$("#formula-field").hidden = !isFormula;

	const allowed = bucketsAllowed();
	$("#bucket-pane").hidden = !allowed;
	if (!allowed) {
		setBucketKind("default");
	}
}

function setBucketKind(kind) {
	state.bucketKind = kind;
	for (const button of $("#bucket-kinds").children) {
		button.classList.toggle("on", button.dataset.kind === kind);
	}
	$("#bucket-default-hint").hidden = kind !== "default";
	$("#scale-field").hidden = kind !== "log";
	$("#linear-fields").hidden = kind !== "linear";
	$("#scale-hint").textContent = scaleHint(Number($("#scale").value));
}

function setMode(mode) {
	state.mode = mode;
	for (const button of $("#modes").children) {
		button.classList.toggle("on", button.dataset.mode === mode);
	}
	if (mode === "metric") {
		state.rows = state.rows.slice(0, 1);
	}
	if (!state.rows.length) {
		addRow();
	}
	if (mode === "formula" && state.rows.length < 2) {
		addRow();
	}
	renderRows();
	refreshPanes();
	refreshGroupOptions();
}

/* ---------- request ---------- */

function buildRequest() {
	const { start, end } = timeWindow();
	const step = Number($("#step").value) || 60;
	const request = {
		schemaVersion: "v1",
		start,
		end,
		requestType: "heatmap",
		compositeQuery: { queries: [] },
		formatOptions: { formatTableResultForUI: false, fillGaps: false },
		noCache: $("#no-cache").checked,
	};

	if (state.mode === "promql") {
		const query = $("#promql").value.trim();
		if (!query) {
			throw new Error("Enter a PromQL query.");
		}
		request.compositeQuery.queries.push({ type: "promql", spec: { name: "A", query, step, disabled: false } });
		return request;
	}

	const inFormula = state.mode === "formula";
	state.rows.forEach((row, index) => {
		if (!row.metric) {
			throw new Error(`Query ${rowLetter(index)} has no metric selected.`);
		}
		const histogram = row.type === "histogram";
		const spec = {
			name: rowLetter(index),
			signal: "metrics",
			aggregations: [
				{
					metricName: row.metric,
					timeAggregation: histogram ? "increase" : row.timeAggregation,
					spaceAggregation: histogram ? "sum" : row.spaceAggregation,
				},
			],
			stepInterval: step,
			// only the enabled query renders the heatmap, so a formula's inputs ride
			// along disabled
			disabled: inFormula,
		};
		if (state.groupBy.length) {
			spec.groupBy = state.groupBy.map((name) => ({ name }));
		}
		if (row.filter) {
			spec.filter = { expression: row.filter };
		}
		request.compositeQuery.queries.push({ type: "builder_query", spec });
	});

	if (inFormula) {
		const expression = $("#formula").value.trim();
		if (!expression) {
			throw new Error("A formula heatmap needs an expression.");
		}
		request.compositeQuery.queries.push({ type: "builder_formula", spec: { name: "F1", expression, disabled: false } });
	}

	if (state.bucketKind === "log") {
		request.bucketOptions = { kind: "log", spec: { scale: Number($("#scale").value) } };
	} else if (state.bucketKind === "linear") {
		request.bucketOptions = { kind: "linear", spec: { maxValue: Number($("#max-value").value), numBuckets: Number($("#num-buckets").value) } };
	}

	return request;
}

async function run() {
	let request;
	try {
		request = buildRequest();
	} catch (error) {
		showBanner(error.message);
		return;
	}

	state.window = { start: request.start, end: request.end };
	state.requestText = JSON.stringify(request, null, "\t");
	renderJSON("#request", state.requestText);
	$("#run").disabled = true;
	$("#run").textContent = "Running…";
	showBanner("");

	try {
		const response = await fetch("/api/v5/query_range", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(request),
		});
		const text = await response.text();
		let parsed = null;
		try {
			parsed = JSON.parse(text);
			state.responseText = JSON.stringify(parsed, null, "\t");
		} catch {
			state.responseText = text;
		}
		renderJSON("#response", state.responseText);

		if (!response.ok) {
			const problem = parsed?.error;
			const detail = (problem?.errors ?? []).map((entry) => entry.message ?? JSON.stringify(entry)).join("\n");
			showBanner(`${response.status} ${problem?.code ?? ""}\n${problem?.message ?? text.slice(0, 600)}${detail ? `\n${detail}` : ""}`.trim());
			setGrid(null, "The request was rejected — see the message above.");
			return;
		}

		const warning = parsed?.data?.warning;
		if (warning?.message) {
			showBanner([warning.message, ...(warning.warnings ?? []).map((entry) => entry.message)].join("\n"));
		}
		const grid = buildGrid(parsed);
		setGrid(grid, "The response carried no series, so there is nothing to draw.");
	} catch (error) {
		showBanner(error.message);
		setGrid(null, "The request could not be sent — see the message above.");
	} finally {
		$("#run").disabled = false;
		$("#run").textContent = "Run query";
	}
}

/* ---------- response ---------- */

function buildGrid(body) {
	const results = body?.data?.data?.results ?? [];
	const result = results.find((entry) => Array.isArray(entry?.aggregations) && entry.aggregations.length);
	if (!result) {
		return null;
	}

	const aggregation = result.aggregations[0];
	const buckets = aggregation.meta?.buckets ?? [];
	const rows = buckets.length + 1;
	const partial = new Set();

	const series = (aggregation.series ?? []).map((entry) => {
		const labels = (entry.labels ?? []).map((label) => `${label.key?.name ?? "?"}=${label.value}`);
		const byTs = new Map();
		let total = 0;
		for (const point of entry.values ?? []) {
			const counts = point.values ?? [];
			byTs.set(point.timestamp, counts);
			total += counts.reduce((sum, count) => sum + count, 0);
			if (point.partial) {
				partial.add(point.timestamp);
			}
		}
		return { key: labels.join(", ") || "(no labels)", byTs, total };
	});

	const timestamps = [...new Set(series.flatMap((entry) => [...entry.byTs.keys()]))].sort((a, b) => a - b);
	series.sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));

	return { queryName: result.queryName, buckets, rows, timestamps, partial, series };
}

function setGrid(grid, emptyReason) {
	state.grid = grid;
	state.emptyReason = emptyReason;
	state.hidden = new Set();
	renderGroups();
	renderChart();
}

function visibleSeries() {
	return state.grid.series.filter((entry) => !state.hidden.has(entry.key));
}

function renderGroups() {
	const grid = state.grid;
	const card = $("#groups-card");
	if (!grid || grid.series.length < 2) {
		card.hidden = true;
		return;
	}

	card.hidden = false;
	$("#group-count").textContent = `${grid.series.length - state.hidden.size} of ${grid.series.length} shown`;
	$("#groups").innerHTML = grid.series
		.map(
			(entry) => `<label><input type="checkbox" data-key="${esc(entry.key)}"${state.hidden.has(entry.key) ? "" : " checked"}>
				<span class="name" title="${esc(entry.key)}">${esc(entry.key)}</span>
				<span class="total">${formatNumber(entry.total)}</span></label>`,
		)
		.join("");
}

/* ---------- chart ---------- */

function bucketRange(grid, row) {
	if (row === grid.rows - 1) {
		return grid.buckets.length ? `> ${formatNumber(grid.buckets[grid.buckets.length - 1])}` : "overflow, the response carried no bucket bounds";
	}
	const upper = formatNumber(grid.buckets[row]);
	return row === 0 ? `<= ${upper}` : `(${formatNumber(grid.buckets[row - 1])}, ${upper}]`;
}

function colorFor(count, max) {
	if (count <= 0) {
		return ZERO_FILL;
	}
	const fraction = max <= 0 ? 1 : state.colorScale === "log" ? Math.log1p(count) / Math.log1p(max) : count / max;
	return RAMP[Math.min(RAMP.length - 1, Math.max(0, Math.round(fraction * (RAMP.length - 1))))];
}

function renderChart() {
	const host = $("#chart");
	const legend = $("#legend");
	const grid = state.grid;
	legend.textContent = "";

	if (!grid) {
		host.innerHTML = `<p class="empty">${esc(state.emptyReason)}</p>`;
		return;
	}
	if (!grid.timestamps.length) {
		host.innerHTML = '<p class="empty">The query returned no columns.</p>';
		return;
	}

	const columns = grid.timestamps.length;
	const shown = visibleSeries();
	const matrix = grid.timestamps.map((ts) => {
		const column = new Array(grid.rows).fill(0);
		for (const entry of shown) {
			const counts = entry.byTs.get(ts);
			if (!counts) {
				continue;
			}
			for (let row = 0; row < grid.rows; row++) {
				column[row] += counts[row] ?? 0;
			}
		}
		return column;
	});

	const max = Math.max(0, ...matrix.flat());
	// clientWidth carries the 12px padding on either side of #chart
	const available = host.clientWidth - 24 - PAD.left - PAD.right;
	const cellWidth = Math.max(3, available / columns);
	const cellHeight = Math.min(22, Math.max(4, MAX_CHART_HEIGHT / grid.rows));
	const plotWidth = cellWidth * columns;
	const plotHeight = cellHeight * grid.rows;
	const gap = cellWidth >= 7 && cellHeight >= 7 ? 1 : 0;
	const span = grid.timestamps[columns - 1] - grid.timestamps[0];

	const cells = [];
	for (let column = 0; column < columns; column++) {
		for (let row = 0; row < grid.rows; row++) {
			const x = PAD.left + column * cellWidth;
			const y = PAD.top + (grid.rows - 1 - row) * cellHeight;
			cells.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(cellWidth - gap).toFixed(2)}" height="${(cellHeight - gap).toFixed(2)}" fill="${colorFor(matrix[column][row], max)}"/>`);
		}
	}

	const rowStride = Math.max(1, Math.ceil(13 / cellHeight));
	const rowLabels = [];
	for (let row = 0; row < grid.rows; row++) {
		if (row % rowStride !== 0 && row !== grid.rows - 1) {
			continue;
		}
		const y = PAD.top + (grid.rows - 1 - row) * cellHeight + cellHeight / 2;
		const text = row === grid.rows - 1 ? "∞" : formatNumber(grid.buckets[row]);
		rowLabels.push(`<text class="axis-label" x="${PAD.left - 6}" y="${(y + 3.2).toFixed(2)}" text-anchor="end">${esc(text)}</text>`);
	}

	const columnStride = Math.max(1, Math.ceil(58 / cellWidth));
	const columnLabels = [];
	for (let column = 0; column < columns; column += columnStride) {
		const ts = grid.timestamps[column];
		const x = PAD.left + column * cellWidth;
		columnLabels.push(`<text class="axis-label" x="${x.toFixed(2)}" y="${(PAD.top + plotHeight + 14).toFixed(2)}">${esc(formatTime(ts, span))}${grid.partial.has(ts) ? "*" : ""}</text>`);
	}

	host.innerHTML = `<svg width="${PAD.left + plotWidth + PAD.right}" height="${PAD.top + plotHeight + PAD.bottom}">
		${cells.join("")}
		<line class="axis-line" x1="${PAD.left}" y1="${PAD.top + plotHeight + 0.5}" x2="${PAD.left + plotWidth}" y2="${PAD.top + plotHeight + 0.5}"/>
		${rowLabels.join("")}${columnLabels.join("")}
		<rect class="cursor-cell" hidden/>
	</svg>`;

	// a heatmap cannot fill gaps, so a chart much shorter than the window asked
	// for means those columns hold no data at all rather than being hidden
	const asked = state.window ? state.window.end - state.window.start : span;
	const covered = `${formatTime(grid.timestamps[0], asked)}–${formatTime(grid.timestamps[columns - 1], asked)}`;
	const coverage =
		state.window && span < 0.9 * asked
			? `${covered}, the only columns with data in the ${formatTime(state.window.start, asked)}–${formatTime(state.window.end, asked)} requested`
			: covered;

	legend.innerHTML = `<span>0</span>
		<div class="swatches"><div class="swatch" style="background:${ZERO_FILL};border:1px solid var(--line)"></div>${RAMP.map((color) => `<div class="swatch" style="background:${color}"></div>`).join("")}</div>
		<span>${formatNumber(max)} per cell</span>
		<span>· ${grid.rows} buckets × ${columns} columns · ${shown.length} of ${grid.series.length} series · ${esc(coverage)}${grid.partial.size ? " · * partial column" : ""}</span>`;

	attachHover(host.querySelector("svg"), { grid, matrix, shown, columns, cellWidth, cellHeight, plotHeight, span, max });
}

function attachHover(svg, view) {
	const tooltip = $("#tooltip");
	const cursor = svg.querySelector(".cursor-cell");

	svg.addEventListener("mouseleave", () => {
		tooltip.hidden = true;
		cursor.setAttribute("hidden", "");
	});

	svg.addEventListener("mousemove", (event) => {
		const box = svg.getBoundingClientRect();
		const column = Math.floor((event.clientX - box.left - PAD.left) / view.cellWidth);
		const row = view.grid.rows - 1 - Math.floor((event.clientY - box.top - PAD.top) / view.cellHeight);
		if (column < 0 || column >= view.columns || row < 0 || row >= view.grid.rows) {
			tooltip.hidden = true;
			cursor.setAttribute("hidden", "");
			return;
		}

		cursor.removeAttribute("hidden");
		cursor.setAttribute("x", PAD.left + column * view.cellWidth);
		cursor.setAttribute("y", PAD.top + (view.grid.rows - 1 - row) * view.cellHeight);
		cursor.setAttribute("width", view.cellWidth);
		cursor.setAttribute("height", view.cellHeight);

		const ts = view.grid.timestamps[column];
		const breakdown = view.shown
			.map((entry) => ({ key: entry.key, count: entry.byTs.get(ts)?.[row] ?? 0 }))
			.filter((entry) => entry.count > 0)
			.sort((a, b) => b.count - a.count);

		tooltip.innerHTML = [
			`<b>${esc(formatNumber(view.matrix[column][row]))}</b> in ${esc(bucketRange(view.grid, row))}`,
			`${esc(new Date(ts).toTimeString().slice(0, 8))}${view.grid.partial.has(ts) ? "  (partial)" : ""}`,
			...breakdown.slice(0, 6).map((entry) => `  ${esc(entry.key)}  ${esc(formatNumber(entry.count))}`),
			breakdown.length > 6 ? `  … ${breakdown.length - 6} more` : "",
		]
			.filter(Boolean)
			.join("\n");

		tooltip.hidden = false;
		const width = tooltip.offsetWidth;
		tooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - width - 8)}px`;
		tooltip.style.top = `${Math.min(event.clientY + 14, window.innerHeight - tooltip.offsetHeight - 8)}px`;
	});
}

/* ---------- chrome ---------- */

function showBanner(message) {
	const banner = $("#banner");
	banner.textContent = message;
	banner.hidden = !message;
}

function renderJSON(selector, text) {
	$(selector).textContent = text.length > MAX_JSON_CHARS ? `${text.slice(0, MAX_JSON_CHARS)}\n… truncated for display, Copy takes the whole thing` : text;
}

function wire() {
	$("#modes").addEventListener("click", (event) => {
		if (event.target.dataset.mode) {
			setMode(event.target.dataset.mode);
		}
	});

	$("#bucket-kinds").addEventListener("click", (event) => {
		if (event.target.dataset.kind) {
			setBucketKind(event.target.dataset.kind);
		}
	});

	$("#scale").addEventListener("input", () => {
		$("#scale-hint").textContent = scaleHint(Number($("#scale").value));
	});

	$("#add-row").addEventListener("click", () => {
		addRow();
		refreshPanes();
	});

	$("#range").addEventListener("change", () => {
		attributesByMetric.clear();
		refreshGroupOptions();
	});

	$("#group-input").addEventListener("change", (event) => {
		const key = event.target.value.trim();
		if (key && !state.groupBy.includes(key)) {
			state.groupBy.push(key);
			renderGroupChips();
			refreshGroupOptions();
		}
		event.target.value = "";
	});

	$("#group-chips").addEventListener("click", (event) => {
		const key = event.target.dataset.key;
		if (key) {
			state.groupBy = state.groupBy.filter((candidate) => candidate !== key);
			renderGroupChips();
			refreshGroupOptions();
		}
	});

	$("#form").addEventListener("submit", (event) => {
		event.preventDefault();
		run();
	});

	$("#color-scale").addEventListener("change", (event) => {
		state.colorScale = event.target.value;
		renderChart();
	});

	$("#groups").addEventListener("change", (event) => {
		const key = event.target.dataset.key;
		if (!key) {
			return;
		}
		if (event.target.checked) {
			state.hidden.delete(key);
		} else {
			state.hidden.add(key);
		}
		$("#group-count").textContent = `${state.grid.series.length - state.hidden.size} of ${state.grid.series.length} shown`;
		renderChart();
	});

	$("#select-all").addEventListener("click", () => {
		state.hidden.clear();
		renderGroups();
		renderChart();
	});

	$("#select-none").addEventListener("click", () => {
		state.hidden = new Set(state.grid.series.map((entry) => entry.key));
		renderGroups();
		renderChart();
	});

	for (const button of document.querySelectorAll("[data-copy]")) {
		button.addEventListener("click", async () => {
			const text = button.dataset.copy === "request" ? state.requestText : state.responseText;
			try {
				await navigator.clipboard.writeText(text);
				button.textContent = "Copied";
			} catch {
				button.textContent = "Copy failed";
			}
			setTimeout(() => {
				button.textContent = "Copy";
			}, 1200);
		});
	}

	let resizeTimer = 0;
	window.addEventListener("resize", () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(renderChart, 120);
	});
}

wire();
setMode("metric");
renderGroupChips();
setBucketKind("default");
