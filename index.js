import { extension_settings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";
import { executeSlashCommandsOnChatInput, registerSlashCommand } from "../../../slash-commands.js";
import {
    defaultSettings,
    ensureSettingsShape,
    findCostumeForTrigger,
    composeCostumePath,
    normalizeCostumeFolder,
    normalizeTriggerEntry,
    normalizeVariantEntry,
} from "./src/simple-switcher.js";

const extensionName = "SillyTavern-CostumeSwitch";
const logPrefix = "[CostumeSwitch]";

let settings = ensureSettingsShape(extension_settings[extensionName] || defaultSettings);
let statusTimer = null;

extension_settings[extensionName] = settings;

function cloneSettings(value) {
    if (typeof structuredClone === "function") {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
}

function persistSettings(reason = "update") {
    settings = ensureSettingsShape(settings);
    extension_settings[extensionName] = cloneSettings(settings);
    try {
        saveSettingsDebounced?.(reason);
    } catch (err) {
        console.error(`${logPrefix} Failed to save settings`, err);
    }
}

function getElement(selector) {
    return document.querySelector(selector);
}

function showStatus(message, type = "info", duration = 2500) {
    const statusEl = getElement("#cs-status");
    const textEl = getElement("#cs-status-text");
    if (!statusEl || !textEl) {
        console.log(`${logPrefix} ${message}`);
        return;
    }

    statusEl.dataset.type = type;
    textEl.innerHTML = message;

    statusEl.classList.add("is-visible");
    if (statusTimer) {
        clearTimeout(statusTimer);
    }
    statusTimer = setTimeout(() => {
        statusEl.classList.remove("is-visible");
        textEl.textContent = "Ready";
        statusTimer = null;
    }, Math.max(duration, 1000));
}

async function issueCostume(folder, { source = "ui" } = {}) {
    const normalized = normalizeCostumeFolder(folder);
    if (!normalized) {
        const message = "Please provide an outfit folder.";
        if (source === "slash") {
            return message;
        }
        showStatus(message, "error");
        return message;
    }

    try {
        await executeSlashCommandsOnChatInput(`/costume \\${normalized}`);
        const successMessage = `Switched to <b>${escapeHtml(normalized)}</b>.`;
        if (source === "slash") {
            return successMessage;
        }
        showStatus(successMessage, "success");
        return successMessage;
    } catch (err) {
        console.error(`${logPrefix} Failed to execute /costume for "${normalized}"`, err);
        const failureMessage = `Failed to switch to <b>${escapeHtml(normalized)}</b>.`;
        if (source === "slash") {
            return failureMessage;
        }
        showStatus(failureMessage, "error", 4000);
        return failureMessage;
    }
}

function escapeHtml(str) {
    const p = document.createElement("p");
    p.textContent = str;
    return p.innerHTML;
}

function handleEnableToggle(event) {
    settings.enabled = Boolean(event.target.checked);
    persistSettings("enabled");
    showStatus(settings.enabled ? "Outfit switching enabled." : "Outfit switching disabled.", "info");
}

function addTriggerRow(trigger = { trigger: "", folder: "" }) {
    settings.triggers.push(normalizeTriggerEntry(trigger));
    persistSettings("triggers");
    renderTriggers();
}

function removeTriggerRow(index) {
    settings.triggers.splice(index, 1);
    persistSettings("triggers");
    renderTriggers();
}

function bindTriggerInputs(row, index) {
    const triggerInput = row.querySelector(".cs-trigger-input");
    const folderInput = row.querySelector(".cs-folder-input");
    const runButton = row.querySelector(".cs-trigger-run");
    const deleteButton = row.querySelector(".cs-trigger-delete");

    triggerInput.value = settings.triggers[index].trigger;
    folderInput.value = settings.triggers[index].folder;

    triggerInput.addEventListener("input", (event) => {
        settings.triggers[index].trigger = event.target.value;
        persistSettings("triggers");
    });

    folderInput.addEventListener("input", (event) => {
        settings.triggers[index].folder = event.target.value;
        persistSettings("triggers");
    });

    runButton.addEventListener("click", async () => {
        if (!settings.enabled) {
            showStatus("Enable Outfit Switcher to use triggers.", "error");
            return;
        }
        const targetFolder = composeCostumePath(settings.baseFolder, settings.triggers[index].folder);
        const result = await issueCostume(targetFolder, { source: "ui" });
        if (result.toLowerCase().startsWith("please provide")) {
            showStatus("Enter an outfit folder before running the trigger.", "error");
        }
    });

    deleteButton.addEventListener("click", () => {
        removeTriggerRow(index);
    });
}

function renderTriggers() {
    const tbody = getElement("#cs-trigger-table-body");
    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";
    settings.triggers.forEach((trigger, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input type="text" class="text_pole cs-trigger-input" placeholder="Trigger" /></td>
            <td><input type="text" class="text_pole cs-folder-input" placeholder="Variant folder" /></td>
            <td class="cs-trigger-actions">
                <button type="button" class="menu_button interactable cs-trigger-run">Run</button>
                <button type="button" class="menu_button interactable cs-trigger-delete">Remove</button>
            </td>
        `;
        tbody.appendChild(row);
        bindTriggerInputs(row, index);
    });

    if (!settings.triggers.length) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `<td colspan="3" class="cs-empty">No triggers yet. Add one below.</td>`;
        tbody.appendChild(emptyRow);
    }
}

function addVariant(variant = { name: "", folder: "" }) {
    settings.variants.push(normalizeVariantEntry(variant));
    persistSettings("variants");
    renderVariants();
    renderTriggers();
}

function removeVariant(index) {
    settings.variants.splice(index, 1);
    persistSettings("variants");
    renderVariants();
    renderTriggers();
}

function bindVariantInputs(row, index) {
    const nameInput = row.querySelector(".cs-variant-name");
    const folderInput = row.querySelector(".cs-variant-folder");
    const runButton = row.querySelector(".cs-variant-run");
    const deleteButton = row.querySelector(".cs-variant-delete");

    nameInput.value = settings.variants[index].name;
    folderInput.value = settings.variants[index].folder;

    nameInput.addEventListener("input", (event) => {
        settings.variants[index].name = event.target.value;
        persistSettings("variants");
    });

    folderInput.addEventListener("input", (event) => {
        settings.variants[index].folder = event.target.value;
        persistSettings("variants");
    });

    runButton.addEventListener("click", async () => {
        if (!settings.enabled) {
            showStatus("Enable Outfit Switcher to use variants.", "error");
            return;
        }
        const targetFolder = composeCostumePath(settings.baseFolder, settings.variants[index].folder);
        const result = await issueCostume(targetFolder, { source: "ui" });
        if (result.toLowerCase().startsWith("please provide")) {
            showStatus("Set the base folder or variant folder before running.", "error");
        }
    });

    deleteButton.addEventListener("click", () => {
        removeVariant(index);
    });
}

function renderVariants() {
    const tbody = getElement("#cs-variant-table-body");
    if (!tbody) {
        return;
    }

    tbody.innerHTML = "";
    settings.variants.forEach((variant, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input type="text" class="text_pole cs-variant-name" placeholder="Variant name" /></td>
            <td><input type="text" class="text_pole cs-variant-folder" placeholder="Subfolder" /></td>
            <td class="cs-variant-actions">
                <button type="button" class="menu_button interactable cs-variant-run">Run</button>
                <button type="button" class="menu_button interactable cs-variant-delete">Remove</button>
            </td>
        `;
        tbody.appendChild(row);
        bindVariantInputs(row, index);
    });

    if (!settings.variants.length) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `<td colspan="3" class="cs-empty">No variants configured. Add one below.</td>`;
        tbody.appendChild(emptyRow);
    }
}

function handleBaseFolderInput(event) {
    settings.baseFolder = event.target.value.trim();
    persistSettings("baseFolder");
}

async function runTriggerByName(triggerName, source = "slash") {
    if (!settings.enabled) {
        const disabledMessage = "Outfit Switcher is disabled.";
        if (source === "slash") {
            return disabledMessage;
        }
        showStatus(disabledMessage, "error");
        return disabledMessage;
    }

    const costume = findCostumeForTrigger(settings, triggerName);
    if (!costume) {
        const unknownMessage = `No outfit mapped for "${escapeHtml(triggerName || "")}".`;
        if (source === "slash") {
            return unknownMessage;
        }
        showStatus(unknownMessage, "error");
        return unknownMessage;
    }

    return issueCostume(costume, { source });
}

function bindUI() {
    const enableCheckbox = getElement("#cs-enable");
    const baseFolderInput = getElement("#cs-base-folder");
    const addVariantButton = getElement("#cs-add-variant");
    const addTriggerButton = getElement("#cs-add-trigger");
    const runBaseButton = getElement("#cs-run-base");

    if (enableCheckbox) {
        enableCheckbox.checked = settings.enabled;
        enableCheckbox.addEventListener("change", handleEnableToggle);
    }

    if (baseFolderInput) {
        baseFolderInput.value = settings.baseFolder;
        baseFolderInput.addEventListener("input", handleBaseFolderInput);
    }

    if (addVariantButton) {
        addVariantButton.addEventListener("click", () => addVariant());
    }

    if (addTriggerButton) {
        addTriggerButton.addEventListener("click", () => addTriggerRow());
    }

    if (runBaseButton) {
        runBaseButton.addEventListener("click", async () => {
            if (!settings.enabled) {
                showStatus("Enable Outfit Switcher to run the base folder.", "error");
                return;
            }
            if (!settings.baseFolder) {
                showStatus("Set a base folder before running it.", "error");
                return;
            }
            await issueCostume(settings.baseFolder, { source: "ui" });
        });
    }

    renderVariants();
    renderTriggers();
}

function initSlashCommand() {
    registerSlashCommand(
        "outfitswitch",
        async (args) => {
            const triggerText = Array.isArray(args) ? args.join(" ") : String(args ?? "");
            return runTriggerByName(triggerText, "slash");
        },
        ["trigger"],
        "Switch the configured character's outfit using a named trigger.",
        false,
    );
}

function init() {
    settings = ensureSettingsShape(extension_settings[extensionName] || defaultSettings);
    extension_settings[extensionName] = settings;

    bindUI();
    showStatus("Ready", "info");
}

initSlashCommand();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
