import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const MODULE_ID = "blood-hunter";
export const SOURCE = "Blood Hunter (Critical Role)";

export const MODES = { CUSTOM: 0, MULTIPLY: 1, ADD: 2, DOWNGRADE: 3, UPGRADE: 4, OVERRIDE: 5 };
const { CUSTOM, ADD, OVERRIDE } = MODES;

export const HEMO_DIE = "@scale.blood-hunter.hemocraft-die";
export const HEMO_MOD = "max(1, @hemocraft.mod)";
export const HEMO_DC = "@hemocraft.dc";

/* -------------------------------------------- */
/*  IDs and cross references                    */
/* -------------------------------------------- */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function makeId(seed) {
  const bytes = createHash("sha256").update(seed).digest();
  let id = "";
  for ( let i = 0; i < 16; i++ ) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}

export const itemId = slug => makeId(`item:${slug}`);

/** Placeholder resolved to a compendium UUID once every document is registered. */
export const ref = slug => `@@REF:${slug}@@`;

/** Content link for descriptions. */
export const link = (slug, label) => `@UUID[${ref(slug)}]{${label}}`;

export const srdSpell = id => `Compendium.dnd5e.spells.Item.${id}`;
export const srdItem = id => `Compendium.dnd5e.items.Item.${id}`;

/* -------------------------------------------- */
/*  Icons                                       */
/* -------------------------------------------- */

const ICON_ROOT = path.resolve(import.meta.dirname, "../../../public");
const FALLBACK_ICON = "icons/svg/item-bag.svg";
export const missingIcons = new Set();

export function icon(p) {
  if ( !p ) return FALLBACK_ICON;
  if ( fs.existsSync(path.join(ICON_ROOT, p)) ) return p;
  missingIcons.add(p);
  return FALLBACK_ICON;
}

/* -------------------------------------------- */
/*  Text                                        */
/* -------------------------------------------- */

/** Turn blank-line separated paragraphs into HTML. Lines starting with "- " become list items. */
export function html(text) {
  const blocks = text.trim().split(/\n\s*\n/).map(b => b.trim());
  return blocks.map(block => {
    const lines = block.split("\n").map(l => l.trim());
    if ( lines.every(l => l.startsWith("- ")) ) {
      return `<ul>${lines.map(l => `<li>${l.slice(2)}</li>`).join("")}</ul>`;
    }
    if ( block.startsWith("<") ) return block;
    return `<p>${lines.join(" ")}</p>`;
  }).join("");
}

/* -------------------------------------------- */
/*  Active effects                              */
/* -------------------------------------------- */

const change = ([key, mode, value, priority]) => ({
  key, mode, value: String(value), priority: priority ?? null
});

export const flagChange = (flag, value = "1") => [`flags.midi-qol.${flag}`, CUSTOM, value];

export const DURATION = {
  untilSourceTurnEnd: { duration: { rounds: 1, turns: 1 }, special: ["turnEndSource"] },
  untilOwnTurnEnd: { duration: { turns: 1 }, special: ["turnEnd"] },
  untilTargetTurnEnd: { duration: { rounds: 1, turns: 1 }, special: ["turnEnd"] },
  oneMinute: { duration: { seconds: 60, rounds: 10 } },
  oneHour: { duration: { seconds: 3600 } },
  rest: { special: ["shortRest", "longRest"] }
};

/**
 * Build an active effect.
 * @param {string} seed  Unique seed for the deterministic ID.
 * @param {object} data
 */
export function effect(seed, {
  name, img, description = "", changes = [], transfer = false, disabled = false, statuses = [],
  duration = {}, special = [], stackable = "noneName", flags = {}, type = "base", showIcon = true
}) {
  return {
    _id: makeId(`effect:${seed}`),
    name,
    img: icon(img),
    type,
    system: {},
    changes: changes.map(c => (c?.key !== undefined ? c : change(c))),
    disabled,
    duration: {
      startTime: null, seconds: null, combat: null, rounds: null, turns: null, startRound: null, startTurn: null,
      ...duration
    },
    description,
    origin: null,
    tint: "#ffffff",
    transfer,
    statuses,
    sort: 0,
    flags: foundry_merge({ dae: { specialDuration: special, stackable, showIcon } }, flags),
    _stats: stats()
  };
}

function foundry_merge(a, b) {
  const out = structuredClone(a);
  for ( const [k, v] of Object.entries(b) ) {
    if ( v && (typeof v === "object") && !Array.isArray(v) && out[k] && (typeof out[k] === "object") ) {
      out[k] = foundry_merge(out[k], v);
    } else out[k] = v;
  }
  return out;
}
export const merge = foundry_merge;

/* -------------------------------------------- */
/*  Activities                                  */
/* -------------------------------------------- */

export const uses = (target = "", value = "1") => ({ type: "itemUses", target, value: String(value), scaling: { mode: "", formula: "" } });
export const useMaledict = () => uses("blood-maledict");
export const hpCost = (formula = HEMO_DIE) => ({ type: "attribute", target: "attributes.hp.value", value: formula, scaling: { mode: "", formula: "" } });

export const range = (value, units = "ft") => (value === "self" ? { units: "self", special: "" } : { value: String(value), units, special: "" });
export const targetCreature = (count = "1") => ({
  template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
  affects: { count: String(count), type: "creature", choice: false, special: "" },
  prompt: true
});
export const targetSelf = () => ({
  template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
  affects: { count: "", type: "self", choice: false, special: "" },
  prompt: false
});
export const targetRadius = size => ({
  template: { count: "", contiguous: false, type: "radius", size: String(size), width: "", height: "", units: "ft" },
  affects: { count: "", type: "creature", choice: true, special: "" },
  prompt: true
});

export const damagePart = (formula, types) => ({
  number: null, denomination: null, bonus: "", types: [].concat(types),
  custom: { enabled: true, formula: String(formula) },
  scaling: { mode: "", number: null, formula: "" }
});

const DEFAULT_MIDI = {
  ignoreTraits: [], triggeredActivityId: "none", triggeredActivityConditionText: "",
  triggeredActivityTargets: "targets", triggeredActivityRollAs: "self", confirmTargets: "default",
  autoTargetType: "any", autoTargetAction: "default", automationOnly: false, otherActivityCompatible: true,
  identifier: "", displayActivityName: true, chooseEffects: false, toggleEffect: false
};

/**
 * Build an activity.
 * @param {string} seed       Seed for the deterministic ID.
 * @param {string} type       Activity type.
 * @param {object} data
 */
export function activity(seed, type, {
  name = "", img = "", activation = "action", activationCondition = "", consume = [], spellSlot = false,
  activityUses = null, target = targetSelf(), rng = range("self"), duration = null, effects = [],
  midi = {}, useCondition = "", effectCondition = "", extra = {}
} = {}) {
  const base = {
    _id: makeId(`activity:${seed}`),
    type,
    name,
    img: img ? icon(img) : "",
    sort: 0,
    activation: { type: activation, value: (activation && !["none", "special", ""].includes(activation)) ? 1 : null, condition: activationCondition, override: false },
    consumption: { targets: consume, scaling: { allowed: false, max: "" }, spellSlot },
    description: { chatFlavor: "" },
    duration: duration ?? { concentration: false, value: "", units: "inst", special: "", override: false },
    effects: effects.map(e => (typeof e === "string" ? { _id: e } : e)),
    range: { ...rng, override: false },
    target: { ...target, override: false },
    uses: activityUses ?? { spent: 0, max: "", recovery: [] },
    visibility: { identifier: "", level: { min: null, max: null }, requireAttunement: false, requireIdentification: false, requireMagic: false },
    useConditionText: useCondition,
    useConditionReason: "",
    effectConditionText: effectCondition,
    macroData: { name: "", command: "" },
    ignoreTraits: { idi: false, idr: false, idv: false, ida: false, idm: false },
    midiProperties: { ...DEFAULT_MIDI, ...midi },
    isOverTimeFlag: false,
    overTimeProperties: { turnChoice: "end", saveRemoves: true, rollAs: "target", preRemoveConditionText: "", postRemoveConditionText: "" },
    otherActivityId: "none",
    otherActivityAsParentType: true
  };
  return merge(base, extra);
}

export const dur = (value, units, concentration = false) => ({ concentration, value: String(value), units, special: "", override: false });

/** Save activity sugar. */
export function saveActivity(seed, opts) {
  const { ability, dc = HEMO_DC, damage = [], onSave = "half", ...rest } = opts;
  return activity(seed, "save", {
    ...rest,
    effects: (rest.effects ?? []).map(e => (typeof e === "string" ? { _id: e, onSave: false } : e)),
    extra: merge({
      save: { ability: [].concat(ability), dc: { calculation: "", formula: dc } },
      damage: { onSave, parts: damage, critical: { allow: false } }
    }, rest.extra ?? {})
  });
}

export function damageActivity(seed, opts) {
  const { damage = [], ...rest } = opts;
  return activity(seed, "damage", {
    ...rest,
    extra: merge({ damage: { critical: { allow: false, bonus: "" }, parts: damage } }, rest.extra ?? {})
  });
}

export function healActivity(seed, opts) {
  const { formula, healType = "healing", ...rest } = opts;
  return activity(seed, "heal", { ...rest, extra: merge({ healing: damagePart(formula, healType) }, rest.extra ?? {}) });
}

export function utilityActivity(seed, opts = {}) {
  const { rollFormula = "", rollName = "", ...rest } = opts;
  return activity(seed, "utility", {
    ...rest,
    extra: merge({ roll: { formula: rollFormula, name: rollName, prompt: false, visible: !!rollFormula } }, rest.extra ?? {})
  });
}

export function castActivity(seed, { spell, level = null, spellSlot = true, ...rest }) {
  return activity(seed, "cast", {
    activation: "", spellSlot, ...rest,
    extra: {
      spell: {
        uuid: spell, level, properties: ["vocal", "somatic", "material"], spellbook: true,
        ability: "", challenge: { attack: null, save: null, override: false }
      }
    }
  });
}

/* -------------------------------------------- */
/*  Items                                       */
/* -------------------------------------------- */

export function stats() {
  return {
    compendiumSource: null, duplicateSource: null, exportSource: null,
    coreVersion: "13.350", systemId: "dnd5e", systemVersion: "5.2.3",
    createdTime: 1792540800000, modifiedTime: 1792540800000, lastModifiedBy: "bloodhunter00000"
  };
}

export const recovery = (period, type = "recoverAll", formula = "") => ({ period, type, formula });

/**
 * Build a feat item.
 */
export function feat(slug, {
  name, img, description, requirements = "", subtype = "", type = "class", identifier = slug,
  usesMax = "", recover = [], activities = [], effects = [], level = null, prereqItems = [],
  flags = {}, properties = []
}) {
  return {
    _slug: slug,
    _id: itemId(slug),
    name,
    type: "feat",
    img: icon(img),
    system: {
      description: { value: description, chat: "" },
      source: { custom: SOURCE, book: "", page: "", license: "", rules: "2014", revision: 1 },
      identifier,
      requirements,
      type: { value: type, subtype },
      uses: { max: usesMax, spent: 0, recovery: recover },
      activities: Object.fromEntries(activities.map((a, i) => [a._id, { ...a, sort: (i + 1) * 100000 }])),
      prerequisites: { level, items: prereqItems, repeatable: false },
      properties,
      enchant: {},
      advancement: []
    },
    effects,
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags,
    _stats: stats()
  };
}
