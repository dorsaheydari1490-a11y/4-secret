const LAYOUT_NAME = "ورود";
const NAME_OBJECT = "ورود_نام";
const WELCOME_OBJECT = "متن_خوشآمد";
const MAX_LENGTH = 20;
const INPUT_LAYOUT = { x: 240, y: 200, width: 300, height: 44 };

let nameInputEl = null;
let activeRuntime = null;
let resetInputOnShow = true;

function getNameInstance(runtime) {
	return runtime.objects[NAME_OBJECT]?.getFirstInstance() ?? null;
}

function shouldShowInput(runtime) {
	if (runtime.layout.name !== LAYOUT_NAME) return false;
	const welcome = runtime.objects[WELCOME_OBJECT]?.getFirstInstance();
	return !(welcome && welcome.isVisible);
}

function getInputLayout(inst) {
	if (inst && Number.isFinite(inst.x) && Number.isFinite(inst.y)) {
		return {
			x: inst.x,
			y: inst.y,
			width: inst.width,
			height: inst.height,
		};
	}
	return INPUT_LAYOUT;
}

function positionInput(runtime) {
	if (!nameInputEl || !activeRuntime) return;
	const inst = getNameInstance(runtime);
	const layer = inst?.layer ?? runtime.layout.getLayer(0);
	if (!layer?.layerToCssPx) return;

	const layout = getInputLayout(inst);
	const left = layout.x - layout.width / 2;
	const top = layout.y - layout.height / 2;
	const right = layout.x + layout.width / 2;
	const bottom = layout.y + layout.height / 2;
	const [cssLeft, cssTop] = layer.layerToCssPx(left, top);
	const [cssRight, cssBottom] = layer.layerToCssPx(right, bottom);

	Object.assign(nameInputEl.style, {
		left: `${cssLeft}px`,
		top: `${cssTop}px`,
		width: `${Math.max(1, cssRight - cssLeft)}px`,
		height: `${Math.max(1, cssBottom - cssTop)}px`,
	});
}

function syncToText(runtime, value) {
	const inst = getNameInstance(runtime);
	if (inst) inst.text = value;
}

async function savePlayerAndStart(runtime) {
	const value = (nameInputEl?.value ?? "").trim();
	if (!value) return;

	syncToText(runtime, value);
	await runtime.storage.setItem("playerName", value);
	await runtime.storage.setItem("savedLayout", "شروع");
	hideNameInput();
	runtime.goToLayout("شروع");
}

function ensureInputElement(runtime) {
	if (nameInputEl) {
		const parent = getOverlayParent(runtime);
		nameInputEl.style.position = parent === document.body ? "fixed" : "absolute";
		if (nameInputEl.parentElement !== parent) {
			parent.appendChild(nameInputEl);
		}
		return nameInputEl;
	}

	const input = document.createElement("input");
	input.type = "text";
	input.lang = "fa";
	input.dir = "rtl";
	input.maxLength = MAX_LENGTH;
	input.placeholder = "نام خود را وارد کنید";
	input.autocomplete = "off";
	input.spellcheck = false;
	Object.assign(input.style, {
		position: "absolute",
		zIndex: "10000",
		boxSizing: "border-box",
		margin: "0",
		padding: "0 8px",
		border: "1px solid rgba(255,255,255,0.4)",
		borderRadius: "4px",
		background: "transparent",
		color: "white",
		fontSize: "22px",
		fontFamily: "Tahoma, Arial, sans-serif",
		textAlign: "center",
		outline: "none",
		display: "none",
	});

	input.addEventListener("input", () => {
		if (!activeRuntime) return;
		const value = input.value.slice(0, MAX_LENGTH);
		if (value !== input.value) input.value = value;
		syncToText(activeRuntime, value);
	});

	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter" && activeRuntime) {
			e.preventDefault();
			savePlayerAndStart(activeRuntime);
		}
	});

	window.addEventListener("resize", () => {
		if (activeRuntime) positionInput(activeRuntime);
	});

	const parent = getOverlayParent(runtime);
	input.style.position = parent === document.body ? "fixed" : "absolute";
	if (input.parentElement !== parent) {
		parent.appendChild(input);
	}
	nameInputEl = input;
	return input;
}

function getOverlayParent(runtime) {
	return runtime?.domOverlayContainer ?? document.body;
}

export function showNameInput(runtime) {
	if (!shouldShowInput(runtime)) {
		hideNameInput();
		return;
	}

	activeRuntime = runtime;
	const input = ensureInputElement(runtime);
	const inst = getNameInstance(runtime);

	if (resetInputOnShow) {
		input.value = inst?.text ?? "";
		resetInputOnShow = false;
	}
	input.style.display = "block";
	positionInput(runtime);
}

export function hideNameInput() {
	if (!nameInputEl) return;
	nameInputEl.style.display = "none";
	nameInputEl.blur();
}

export function updateNameInput(runtime) {
	if (!shouldShowInput(runtime)) {
		hideNameInput();
		return;
	}

	activeRuntime = runtime;
	const input = ensureInputElement(runtime);
	input.style.display = "block";
	positionInput(runtime);
}

export function prepareNameInputForLayout() {
	resetInputOnShow = true;
}

export function teardownNameInput() {
	hideNameInput();
	activeRuntime = null;
	resetInputOnShow = true;
}
