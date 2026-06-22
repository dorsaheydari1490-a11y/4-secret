import {
	showNameInput,
	updateNameInput,
	teardownNameInput,
	prepareNameInputForLayout,
	hideNameInput,
	applyLoginLayoutState,
} from "./nameInput.js";

const LAYOUT_NAME = "ورود";

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

	runtime.addEventListener("tick", () => {
		if (runtime.layout.name === LAYOUT_NAME) {
			updateNameInput(runtime);
		} else {
			hideNameInput();
		}
	});
});