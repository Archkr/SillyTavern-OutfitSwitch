import {
    DEFAULT_PROFILE_NAME,
    SCHEMA_VERSION,
    composeCostumePath,
    defaultProfile,
    defaultSettings,
    ensureProfileShape,
    ensureSettingsShape,
    findCostumeForTrigger,
    resolveProfile,
    normalizeCostumeFolder,
    normalizeTriggerEntry,
    normalizeVariantEntry,
} from "./profile-utils.js";

export function buildStreamBuffer(previous, tokenText, { limit = 2000 } = {}) {
    const base = typeof previous === "string" ? previous : "";
    const token = typeof tokenText === "string" ? tokenText : "";
    const combined = base + token;

    if (!Number.isFinite(limit) || limit <= 0) {
        return combined;
    }

    return combined.length > limit ? combined.slice(-limit) : combined;
}

function uniqueFlags(flags) {
    const list = Array.from(new Set(String(flags || "").split("")));
    return list.join("");
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseTriggerPattern(raw, { forceRegexCaseInsensitive = true } = {}) {
    if (typeof raw !== "string") {
        return null;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
        return null;
    }

    const regexMatch = trimmed.match(/^\/((?:\\.|[^/])+?)\/([gimsuy]*)$/);
    if (regexMatch) {
        const [, source, flagGroup] = regexMatch;
        const mergedFlags = forceRegexCaseInsensitive
            ? uniqueFlags(`${flagGroup || ""}i`)
            : uniqueFlags(flagGroup || "");
        try {
            const regex = new RegExp(source, mergedFlags || (forceRegexCaseInsensitive ? "i" : ""));
            return { type: "regex", raw: trimmed, regex };
        } catch (error) {
            console.warn("[OutfitSwitch] Invalid trigger regex", trimmed, error);
            return null;
        }
    }

    if (trimmed.startsWith("/")) {
        return null;
    }

    return { type: "literal", raw: trimmed, value: trimmed.toLowerCase() };
}

function collectTriggerPatterns(entry, { forceRegexCaseInsensitive = true } = {}) {
    const triggers = Array.isArray(entry?.triggers) && entry.triggers.length
        ? entry.triggers
        : (entry?.trigger ? [entry.trigger] : []);

    const patterns = [];
    triggers.forEach((trigger) => {
        const pattern = parseTriggerPattern(trigger, { forceRegexCaseInsensitive });
        if (pattern) {
            patterns.push(pattern);
        }
    });

    return patterns;
}

export function findCostumeForText(settingsOrProfile, text) {
    const profile = resolveProfile(settingsOrProfile);
    if (!profile || typeof text !== "string") {
        return null;
    }

    let normalizedText = text;

    // 1. Global Ignore Patterns
    const globalPatterns = typeof settingsOrProfile?.globalIgnorePatterns === 'string'
        ? settingsOrProfile.globalIgnorePatterns.split(/\r?\n/).filter(Boolean)
        : ['<think>[\\s\\S]*?<\\/think>']; // Default fallback if undefined, though usually set

    for (const pattern of globalPatterns) {
        try {
            // Check if pattern looks like a regex /.../flags
            const regexParts = pattern.match(/^\/((?:\\.|[^/])+?)\/([gimsuy]*)$/);
            if (regexParts) {
                normalizedText = normalizedText.replace(new RegExp(regexParts[1], regexParts[2] || 'gi'), '');
            } else {
                // Treat as simple regex string, allow 'gi' by default
                normalizedText = normalizedText.replace(new RegExp(pattern, 'gi'), '');
            }
        } catch (e) {
            console.warn('[OutfitSwitch] Invalid global ignore pattern:', pattern, e);
        }
    }

    if (!normalizedText.trim()) {
        return null;
    }

    // 2. Ignore Dialogue (Quote Masking)
    if (settingsOrProfile?.ignoreDialogue) {
        // Simple quote matching: "..." or “...” or ‘...’
        // We replace content with space to preserve word boundaries but remove keywords
        const quoteRegex = /"[\s\S]*?"|“[\s\S]*?”|'[\s\S]*?'/g;
        normalizedText = normalizedText.replace(quoteRegex, (match) => ' '.repeat(match.length));
    }

    const lower = normalizedText.toLowerCase();
    const forceRegexCaseInsensitive = settingsOrProfile?.forceRegexCaseInsensitive === undefined
        ? true
        : Boolean(settingsOrProfile.forceRegexCaseInsensitive);

    for (const entry of profile.triggers || []) {
        const patterns = collectTriggerPatterns(entry, { forceRegexCaseInsensitive });
        if (!patterns.length) {
            continue;
        }

        const costume = composeCostumePath(profile.baseFolder, entry.folder);
        if (!costume) {
            continue;
        }

        const matchMode = entry?.matchMode === 'whole' ? 'whole' : 'contains';
        for (const pattern of patterns) {
            if (pattern.type === 'literal') {
                if (
                    matchMode === 'whole'
                        ? new RegExp(`\\b${escapeRegex(pattern.raw)}\\b`, 'i').test(normalizedText)
                        : lower.includes(pattern.value)
                ) {
                    return { costume, trigger: pattern.raw, type: 'literal' };
                }
            } else if (pattern.type === 'regex') {
                pattern.regex.lastIndex = 0;
                if (pattern.regex.test(normalizedText)) {
                    return { costume, trigger: pattern.raw, type: 'regex' };
                }
            }
        }
    }

    return null;
}


export {
    DEFAULT_PROFILE_NAME,
    SCHEMA_VERSION,
    composeCostumePath,
    defaultProfile,
    defaultSettings,
    ensureProfileShape,
    ensureSettingsShape,
    findCostumeForTrigger,
    resolveProfile,
    normalizeCostumeFolder,
    normalizeTriggerEntry,
    normalizeVariantEntry,
};
