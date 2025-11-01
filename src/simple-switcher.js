export const defaultSettings = {
    enabled: false,
    baseFolder: "",
    variants: [],
    triggers: [],
};

function cloneVariants(variants) {
    if (!Array.isArray(variants)) {
        return [];
    }
    return variants.map((entry) => normalizeVariantEntry(entry));
}

function cloneTriggers(triggers) {
    if (!Array.isArray(triggers)) {
        return [];
    }
    return triggers.map((entry) => normalizeTriggerEntry(entry));
}

export function normalizeVariantEntry(entry = {}) {
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const folder = typeof entry.folder === "string" ? entry.folder.trim() : "";
    return { name, folder };
}

export function normalizeTriggerEntry(entry = {}) {
    const trigger = typeof entry.trigger === "string" ? entry.trigger.trim() : "";
    let folder = "";
    if (typeof entry.folder === "string") {
        folder = entry.folder.trim();
    } else if (typeof entry.costume === "string") {
        folder = entry.costume.trim();
    }
    return { trigger, folder };
}

export function ensureSettingsShape(raw = {}) {
    const enabled = Boolean(raw.enabled);
    const baseFolder = typeof raw.baseFolder === "string" ? raw.baseFolder.trim() : "";
    const variants = cloneVariants(raw.variants);
    const triggers = cloneTriggers(raw.triggers);

    return { enabled, baseFolder, variants, triggers };
}

export function normalizeCostumeFolder(rawFolder) {
    if (!rawFolder) {
        return "";
    }
    let folder = String(rawFolder).trim();
    folder = folder.replace(/^\\+/, "");
    folder = folder.replace(/^\/+/, "");
    folder = folder.replace(/\\+/g, "/");
    folder = folder.replace(/\/+$/, "");
    return folder;
}

export function findCostumeForTrigger(settings, key) {
    if (!settings || !Array.isArray(settings.triggers)) {
        return "";
    }

    const lookup = String(key ?? "").trim().toLowerCase();
    if (!lookup) {
        return "";
    }

    for (const entry of settings.triggers) {
        const normalized = String(entry?.trigger ?? "").trim().toLowerCase();
        if (normalized && normalized === lookup) {
            return composeCostumePath(settings.baseFolder, entry.folder);
        }
    }

    return "";
}

export function composeCostumePath(baseFolder = "", variantFolder = "") {
    const base = normalizeCostumeFolder(baseFolder);
    const variant = normalizeCostumeFolder(variantFolder);
    if (base && variant) {
        return `${base}/${variant}`.replace(/\/{2,}/g, "/");
    }
    return variant || base;
}
