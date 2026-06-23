const LAYOUT_NAME = "ورود";
const NAME_OBJECT = "ورود_نام";
const WELCOME_OBJECT = "متن_خوشآمد";
const LOGOUT_BUTTON = "دکمه_خروج";
const LOGOUT_TEXT = "متن_دکمه_خروج";
const START_LAYOUT = "شروع";
const PLAYER_NAME_KEY = "playerName";
const SAVED_LAYOUT_KEY = "savedLayout";
const MAX_LENGTH = 20;
const INPUT_LAYOUT = { x: 240, y: 200, width: 300, height: 44 };

const BAD_PLAYER_NAMES = new Set([
	"ورود_نام.Text",
	"text.نام_ورود",
]);

let nameInputEl = null;
let activeRuntime = null;
let resetInputOnShow = true;
let navigationIntent = null;

export function tryAcquireNavigation(intent) {
	if (navigationIntent) return false;
	navigationIntent = intent;
	return true;
}

export function releaseNavigation() {
	navigationIntent = null;
}

function isBadPlayerName(name) {
	const trimmed = (name ?? "").trim();
	if (!trimmed) return true;
	if (BAD_PLAYER_NAMES.has(trimmed)) return true;
	if (trimmed.includes("ورود_نام") || trimmed.includes("نام_ورود")) return true;
	return false;
}

function getLocalStorageInst(runtime) {
	return runtime.objects.LocalStorage?.getFirstInstance?.() ?? null;
}

async function storageGetItem(runtime, key) {
	const ls = getLocalStorageInst(runtime);
	const [fromRuntime, fromPlugin] = await Promise.all([
		runtime.storage.getItem(key),
		ls?.getItem ? ls.getItem(key) : Promise.resolve(null),
	]);
	const runtimeValue = (fromRuntime ?? "").trim();
	const pluginValue = (fromPlugin ?? "").trim();
	return runtimeValue || pluginValue || null;
}

async function storageSetItem(runtime, key, value) {
	await runtime.storage.setItem(key, value);
	const ls = getLocalStorageInst(runtime);
	if (ls?.setItem) {
		await ls.setItem(key, value);
	}
}

async function storageRemoveItem(runtime, key) {
	await runtime.storage.removeItem(key);
	const ls = getLocalStorageInst(runtime);
	if (ls?.removeItem) {
		await ls.removeItem(key);
	}
}

export async function clearPlayerSession(runtime) {
	await storageRemoveItem(runtime, PLAYER_NAME_KEY);
	await storageRemoveItem(runtime, SAVED_LAYOUT_KEY);
}

export async function savePlayerSession(runtime, name) {
	await storageSetItem(runtime, PLAYER_NAME_KEY, name);
}

async function getSavedLayout(runtime) {
	const ls = getLocalStorageInst(runtime);
	const [fromRuntime, fromPlugin] = await Promise.all([
		runtime.storage.getItem(SAVED_LAYOUT_KEY),
		ls?.getItem ? ls.getItem(SAVED_LAYOUT_KEY) : Promise.resolve(null),
	]);
	const runtimeValue = (fromRuntime ?? "").trim();
	const pluginValue = (fromPlugin ?? "").trim();
	return pluginValue || runtimeValue || null;
}

function getNameInstance(runtime) {
	return runtime.objects[NAME_OBJECT]?.getFirstInstance() ?? null;
}

function setInstanceVisible(runtime, objectName, visible) {
	const inst = runtime.objects[objectName]?.getFirstInstance();
	if (!inst) return;
	inst.isVisible = visible;
	if (typeof inst.setCollisionEnabled === "function") {
		inst.setCollisionEnabled(visible);
	}
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

export function getPlayerNameValue(runtime) {
	const fromInput = (nameInputEl?.value ?? "").trim();
	if (fromInput) return fromInput;
	const inst = getNameInstance(runtime);
	return (inst?.text ?? "").trim();
}

export function resetToNewUserUI(runtime) {
	setInstanceVisible(runtime, "دکمه_ادامه", false);
	setInstanceVisible(runtime, "دکمه_شروع_جدید", false);
	setInstanceVisible(runtime, WELCOME_OBJECT, false);
	setInstanceVisible(runtime, "متن_دکمه_ادامه", false);
	setInstanceVisible(runtime, "متن_دکمه_شروع_جدید", false);
	setInstanceVisible(runtime, LOGOUT_BUTTON, false);
	setInstanceVisible(runtime, LOGOUT_TEXT, false);
	setInstanceVisible(runtime, "دکمه_شروع", true);
	setInstanceVisible(runtime, "متن_دکمه_شروع", true);
	setInstanceVisible(runtime, NAME_OBJECT, false);

	const inst = getNameInstance(runtime);
	if (inst) inst.text = "";

	prepareNameInputForLayout();
	showNameInput(runtime);
}

function showReturningUserUI(runtime, name) {
	const welcome = runtime.objects[WELCOME_OBJECT]?.getFirstInstance();
	if (welcome) {
		welcome.text = `سلام ${name}`;
		welcome.isVisible = true;
	}
	setInstanceVisible(runtime, "دکمه_ادامه", true);
	setInstanceVisible(runtime, "دکمه_شروع_جدید", true);
	setInstanceVisible(runtime, "متن_دکمه_ادامه", true);
	setInstanceVisible(runtime, "متن_دکمه_شروع_جدید", true);
	setInstanceVisible(runtime, LOGOUT_BUTTON, true);
	setInstanceVisible(runtime, LOGOUT_TEXT, true);
	setInstanceVisible(runtime, NAME_OBJECT, false);
	setInstanceVisible(runtime, "دکمه_شروع", false);
	setInstanceVisible(runtime, "متن_دکمه_شروع", false);
	hideNameInput();
}

export async function sanitizePlayerNameOnLayoutStart(runtime) {
	const raw = await storageGetItem(runtime, PLAYER_NAME_KEY);
	if (raw == null) return false;
	if (!isBadPlayerName(raw)) return false;

	await storageRemoveItem(runtime, PLAYER_NAME_KEY);
	return true;
}

export async function applyLoginLayoutState(runtime) {
	const sanitized = await sanitizePlayerNameOnLayoutStart(runtime);
	if (sanitized) {
		resetToNewUserUI(runtime);
		return;
	}

	const raw = await storageGetItem(runtime, PLAYER_NAME_KEY);
	const name = (raw ?? "").trim();
	if (!name) return;
	showReturningUserUI(runtime, name);
}

export async function logoutPlayerName(runtime) {
	if (runtime.layout.name !== LAYOUT_NAME) return;
	await clearPlayerSession(runtime);
	hideNameInput();
	resetToNewUserUI(runtime);
}

export async function changePlayerName(runtime) {
	return logoutPlayerName(runtime);
}

async function navigateFromLogin(runtime, layoutName) {
	hideNameInput();
	activeRuntime = null;
	runtime.goToLayout(layoutName);
}

export async function savePlayerAndStart(runtime, intent = "new") {
	if (navigationIntent === "fresh") return;
	if (!tryAcquireNavigation(intent)) return;

	try {
		const value = getPlayerNameValue(runtime);
		const storedName = (await storageGetItem(runtime, PLAYER_NAME_KEY) ?? "").trim();
		const name = value || storedName;
		if (!name) return;

		syncToText(runtime, name);
		await savePlayerSession(runtime, name);

		const existingLayout = await getSavedLayout(runtime);
		if (existingLayout) {
			await navigateFromLogin(runtime, existingLayout);
		} else {
			await storageSetItem(runtime, SAVED_LAYOUT_KEY, START_LAYOUT);
			await navigateFromLogin(runtime, START_LAYOUT);
		}
	} finally {
		releaseNavigation();
	}
}

export async function startFreshGame(runtime) {
	if (!tryAcquireNavigation("fresh")) return;

	try {
		await storageSetItem(runtime, SAVED_LAYOUT_KEY, START_LAYOUT);
		hideNameInput();
		activeRuntime = null;
		await navigateFromLogin(runtime, START_LAYOUT);
	} finally {
		releaseNavigation();
	}
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
		const inputValue = input.value.slice(0, MAX_LENGTH);
		if (inputValue !== input.value) input.value = inputValue;
		syncToText(activeRuntime, inputValue);
	});

	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter" && activeRuntime) {
			e.preventDefault();
			savePlayerAndStart(activeRuntime, "new");
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
