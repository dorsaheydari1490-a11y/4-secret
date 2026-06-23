import {
	showNameInput,
	updateNameInput,
	teardownNameInput,
	prepareNameInputForLayout,
	hideNameInput,
	applyLoginLayoutState,
	logoutPlayerName,
	savePlayerAndStart,
	startFreshGame,
} from "./nameInput.js";

const LAYOUT_NAME = "ورود";
const WELCOME_OBJECT = "متن_خوشآمد";
const LOGOUT_TARGETS = ["دکمه_خروج", "متن_دکمه_خروج"];
const CONTINUE_TARGETS = ["دکمه_ادامه", "متن_دکمه_ادامه"];
const FRESH_TARGETS = ["دکمه_شروع_جدید", "متن_دکمه_شروع_جدید"];
const NEW_START_TARGETS = ["دکمه_شروع", "متن_دکمه_شروع"];

function isOverInstance(runtime, inst) {
	if (!inst?.isVisible) return false;
	const layer = inst.layer;
	const mx = runtime.mouse.getMouseX(layer);
	const my = runtime.mouse.getMouseY(layer);
	if (typeof inst.testPointOverlap === "function") {
		return inst.testPointOverlap(mx, my);
	}
	const hw = inst.width / 2;
	const hh = inst.height / 2;
	return mx >= inst.x - hw && mx <= inst.x + hw && my >= inst.y - hh && my <= inst.y + hh;
}

function isOverInstanceAt(runtime, inst, clientX, clientY) {
	if (!inst?.isVisible || !inst.layer?.cssPxToLayer) return false;
	const [lx, ly] = inst.layer.cssPxToLayer(clientX, clientY);
	if (typeof inst.testPointOverlap === "function") {
		return inst.testPointOverlap(lx, ly);
	}
	const hw = inst.width / 2;
	const hh = inst.height / 2;
	return lx >= inst.x - hw && lx <= inst.x + hw && ly >= inst.y - hh && ly <= inst.y + hh;
}

function isReturningUser(runtime) {
	const welcome = runtime.objects[WELCOME_OBJECT]?.getFirstInstance();
	return welcome?.isVisible ?? false;
}

function pointerHitsTargets(runtime, targetNames) {
	return targetNames.some((name) => {
		const inst = runtime.objects[name]?.getFirstInstance();
		return isOverInstance(runtime, inst);
	});
}

function pointerHitsTargetsAt(runtime, targetNames, clientX, clientY) {
	return targetNames.some((name) => {
		const inst = runtime.objects[name]?.getFirstInstance();
		return isOverInstanceAt(runtime, inst, clientX, clientY);
	});
}

function pointerHitsLogout(runtime) {
	if (!isReturningUser(runtime)) return false;
	return pointerHitsTargets(runtime, LOGOUT_TARGETS);
}

function pointerHitsLogoutAt(runtime, clientX, clientY) {
	if (!isReturningUser(runtime)) return false;
	return pointerHitsTargetsAt(runtime, LOGOUT_TARGETS, clientX, clientY);
}

function resolveLoginClick(runtime) {
	if (pointerHitsLogout(runtime)) return "logout";
	if (isReturningUser(runtime)) {
		if (pointerHitsTargets(runtime, FRESH_TARGETS)) return "fresh";
		if (pointerHitsTargets(runtime, CONTINUE_TARGETS)) return "continue";
		return null;
	}
	if (pointerHitsTargets(runtime, NEW_START_TARGETS)) return "new";
	return null;
}

function resolveLoginClickAt(runtime, clientX, clientY) {
	if (pointerHitsLogoutAt(runtime, clientX, clientY)) return "logout";
	if (isReturningUser(runtime)) {
		if (pointerHitsTargetsAt(runtime, FRESH_TARGETS, clientX, clientY)) return "fresh";
		if (pointerHitsTargetsAt(runtime, CONTINUE_TARGETS, clientX, clientY)) return "continue";
		return null;
	}
	if (pointerHitsTargetsAt(runtime, NEW_START_TARGETS, clientX, clientY)) return "new";
	return null;
}

let logoutBusy = false;

async function handleLoginClick(runtime, action) {
	if (!action || runtime.layout.name !== LAYOUT_NAME) return;

	if (action === "logout") {
		if (logoutBusy) return;
		logoutBusy = true;
		try {
			await logoutPlayerName(runtime);
		} finally {
			logoutBusy = false;
		}
		return;
	}

	if (action === "fresh") {
		await startFreshGame(runtime);
		return;
	}

	if (action === "continue") {
		await savePlayerAndStart(runtime, "continue");
		return;
	}

	if (action === "new") {
		await savePlayerAndStart(runtime, "new");
	}
}

runOnStartup(async (runtime) => {
	runtime.addEventListener("afteranylayoutstart", async (e) => {
		if (e.layout.name === LAYOUT_NAME) {
			prepareNameInputForLayout();
			await applyLoginLayoutState(runtime);
			showNameInput(runtime);
		} else {
			teardownNameInput();
		}
	});

	let lastMouseDown = false;
	runtime.addEventListener("tick", () => {
		if (runtime.layout.name === LAYOUT_NAME) {
			const mouseDown = runtime.mouse.isMouseButtonPressed(0);
			if (mouseDown && !lastMouseDown) {
				handleLoginClick(runtime, resolveLoginClick(runtime));
			}
			lastMouseDown = mouseDown;
			updateNameInput(runtime);
		} else {
			lastMouseDown = false;
			hideNameInput();
		}
	});

	runtime.addEventListener("pointerdown", (e) => {
		handleLoginClick(runtime, resolveLoginClickAt(runtime, e.clientX, e.clientY));
	});
});