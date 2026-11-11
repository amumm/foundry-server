import { itemId, makeId, ref, srdItem, stats, html, link } from "../lib/helpers.mjs";

const CURSE_CHOICE_LEVELS = [1, 6, 10, 14, 18];
const CURSE_POOL = [
  "curse-anxious", "curse-binding", "curse-bloated-agony", "curse-exposure", "curse-eyeless",
  "curse-fallen-puppet", "curse-marked", "curse-muddled-mind"
];
const RITE_LEVELS = [2, 7, 14];
const RITE_POOL = ["rite-flame", "rite-frozen", "rite-storm", "rite-dead", "rite-oracle", "rite-roar"];
const FS_POOL = ["fs-archery", "fs-dueling", "fs-great-weapon-fighting", "fs-two-weapon-fighting"];
const ORDER_POOL = ["order-ghostslayer", "order-lycan", "order-mutant", "order-profane-soul"];

function itemUuid(slug) {
  return { uuid: ref(slug), optional: false };
}

function itemGrant(level, title, slugs) {
  return {
    _id: makeId(`bh-grant-${level}-${slugs.join("-")}`),
    type: "ItemGrant",
    configuration: {
      items: slugs.map(itemUuid),
      optional: false,
      spell: { ability: [], preparation: "", uses: { max: "", per: "" } }
    },
    value: {},
    level,
    title
  };
}

function itemChoice(level, title, pool, { count = 1, subtype, featLevel = null } = {}) {
  return {
    _id: makeId(`bh-choice-${level}-${title}`),
    type: "ItemChoice",
    configuration: {
      choices: { [level]: { count, replacement: true } },
      allowDrops: false,
      type: "feat",
      pool: pool.map(itemUuid),
      restriction: { type: "feat", subtype, level: featLevel }
    },
    value: { added: {}, replaced: {} },
    level,
    title
  };
}

function scaleValue(id, title, type, scale) {
  return {
    _id: makeId(`bh-scale-${id}`),
    type: "ScaleValue",
    configuration: { identifier: id, type, scale, distance: { units: "" } },
    value: {},
    level: 1,
    title
  };
}

function asi(level) {
  return {
    _id: makeId(`bh-asi-${level}`),
    type: "AbilityScoreImprovement",
    configuration: { cap: 2, fixed: {}, locked: [], points: 2 },
    value: { type: "asi" },
    level,
    title: ""
  };
}

export default function classDocs() {
  const advancement = [
    { _id: makeId("bh-hp"), type: "HitPoints", configuration: {}, value: {}, title: "Hit Points", icon: "systems/dnd5e/icons/svg/hit-points.svg" },
    {
      _id: makeId("bh-armor"), type: "Trait", level: 1, classRestriction: "primary", title: "",
      configuration: { mode: "default", allowReplacements: false, grants: ["armor:lgt", "armor:med", "armor:shl"], choices: [] },
      value: { chosen: [] }
    },
    {
      _id: makeId("bh-weapons"), type: "Trait", level: 1, title: "",
      configuration: { mode: "default", allowReplacements: false, grants: ["weapon:sim", "weapon:mar"], choices: [] },
      value: { chosen: [] }
    },
    {
      _id: makeId("bh-saves"), type: "Trait", level: 1, classRestriction: "primary", title: "",
      configuration: { mode: "default", allowReplacements: false, grants: ["saves:dex", "saves:int"], choices: [] },
      value: { chosen: [] }
    },
    {
      _id: makeId("bh-tools"), type: "Trait", level: 1, title: "",
      configuration: { mode: "default", allowReplacements: false, grants: ["tool:alchemist"], choices: [] },
      value: { chosen: [] }
    },
    {
      _id: makeId("bh-skills"), type: "Trait", level: 1, classRestriction: "primary", title: "",
      configuration: {
        mode: "default", allowReplacements: false, grants: [],
        choices: [{
          count: 3,
          pool: ["skills:acr", "skills:arc", "skills:ath", "skills:his", "skills:ins", "skills:inv", "skills:rel", "skills:sur"]
        }]
      },
      value: { chosen: [] }
    },
    scaleValue("hemocraft-die", "Hemocraft Die", "dice", {
      1: { number: null, faces: 4, modifiers: [] },
      5: { number: null, faces: 6, modifiers: [] },
      11: { number: null, faces: 8, modifiers: [] },
      17: { number: null, faces: 10, modifiers: [] }
    }),
    scaleValue("maledict-uses", "Blood Maledict Uses", "number", { 1: { value: 1 }, 6: { value: 2 }, 13: { value: 3 }, 17: { value: 4 } }),
    scaleValue("curses-known", "Blood Curses Known", "number", {
      1: { value: 1 }, 6: { value: 2 }, 10: { value: 3 }, 14: { value: 4 }, 18: { value: 5 }
    }),
    scaleValue("rites-known", "Crimson Rites Known", "number", { 2: { value: 1 }, 7: { value: 2 }, 14: { value: 3 } }),
    scaleValue("brand-mult", "Brand Damage Multiplier", "number", { 1: { value: 1 }, 13: { value: 2 } }),
    itemGrant(1, "Features", ["hunters-bane", "blood-maledict"]),
    ...CURSE_CHOICE_LEVELS.map(l => itemChoice(l, "Blood Curse", CURSE_POOL, { subtype: "bloodCurse" })),
    itemGrant(2, "Features", ["crimson-rite"]),
    itemChoice(2, "Fighting Style", FS_POOL, { subtype: "fightingStyle" }),
    ...RITE_LEVELS.map(l => itemChoice(l, "Crimson Rite", RITE_POOL, { subtype: "crimsonRite", featLevel: l >= 14 ? 14 : null })),
    {
      _id: makeId("bh-subclass"), type: "Subclass", configuration: {}, value: {},
      level: 3, title: "Blood Hunter Order"
    },
    itemGrant(5, "Features", ["extra-attack"]),
    itemGrant(6, "Features", ["brand-of-castigation"]),
    itemGrant(9, "Features", ["grim-psychometry"]),
    itemGrant(10, "Features", ["dark-augmentation"]),
    itemGrant(13, "Features", ["brand-of-tethering"]),
    itemGrant(14, "Features", ["hardened-soul"]),
    itemGrant(20, "Features", ["sanguine-mastery"]),
    ...[4, 8, 12, 16, 19].map(asi)
  ];

  const orWeapons = makeId("bh-se-or-weapons");
  const orArmor = makeId("bh-se-or-armor");

  const classDoc = {
    _slug: "blood-hunter",
    _id: itemId("blood-hunter"),
    name: "Blood Hunter",
    type: "class",
    img: "icons/skills/wounds/blood-spurt-spray-red.webp",
    system: {
      description: {
        value: html(`
          Blood hunters are clever warriors driven by an unending determination to destroy evils old and new. Armed with
          rites of secretive blood magic and a willingness to sacrifice their own vitality and humanity for their cause,
          they protect the realms from the shadows.

          <h3>Hit Points</h3>
          <p><strong>Hit Dice:</strong> 1d10 per blood hunter level<br />
          <strong>Hit Points at 1st Level:</strong> 10 + your Constitution modifier<br />
          <strong>Hit Points at Higher Levels:</strong> 1d10 (or 6) + your Constitution modifier per blood hunter level after 1st</p>

          <h3>Proficiencies</h3>
          <p><strong>Armor:</strong> Light armor, medium armor, shields<br />
          <strong>Weapons:</strong> Simple weapons, martial weapons<br />
          <strong>Tools:</strong> Alchemist's supplies<br />
          <strong>Saving Throws:</strong> Dexterity, Intelligence<br />
          <strong>Skills:</strong> Choose three from Acrobatics, Arcana, Athletics, History, Insight, Investigation, Religion, and Survival</p>

          <p>See ${link("variant-hemocraft-wisdom", "Variant Hemocraft (Wisdom)")} to use Wisdom instead of Intelligence.</p>
        `),
        chat: ""
      },
      source: { custom: "Blood Hunter (Critical Role)", book: "", page: "", license: "", rules: "2014", revision: 1 },
      identifier: "blood-hunter",
      levels: 1,
      hitDice: "d10",
      hitDiceUsed: 0,
      spellcasting: { progression: "none", ability: "", preparation: {} },
      primaryAbility: { value: [] },
      advancement,
      startingEquipment: [
        { type: "OR", _id: orWeapons, group: "", sort: 100000, requiresProficiency: false },
        { type: "weapon", count: 1, key: "mar", _id: makeId("bh-se-mar"), group: orWeapons, sort: 200000, requiresProficiency: false },
        { type: "weapon", count: 2, key: "sim", _id: makeId("bh-se-sim2"), group: orWeapons, sort: 300000, requiresProficiency: false },
        { type: "linked", count: 1, key: srdItem("ddWvQRLmnnIS0eLF"), _id: makeId("bh-se-xbow"), group: "", sort: 400000, requiresProficiency: false },
        { type: "linked", count: 20, key: srdItem("SItCnYBqhzqBoaWG"), _id: makeId("bh-se-bolts"), group: "", sort: 500000, requiresProficiency: false },
        { type: "OR", _id: orArmor, group: "", sort: 600000, requiresProficiency: false },
        { type: "linked", count: 1, key: srdItem("TIV3B1vbrVHIhQAm"), _id: makeId("bh-se-studded"), group: orArmor, sort: 700000, requiresProficiency: false },
        { type: "linked", count: 1, key: srdItem("XmnlF5fgIO3tg6TG"), _id: makeId("bh-se-scale"), group: orArmor, sort: 800000, requiresProficiency: false },
        { type: "linked", count: 1, key: srdItem("8KWz5DJbWUpNWniP"), _id: makeId("bh-se-pack"), group: "", sort: 900000, requiresProficiency: false },
        { type: "linked", count: 1, key: srdItem("SztwZhbhZeCqyAes"), _id: makeId("bh-se-alchemy"), group: "", sort: 1000000, requiresProficiency: false }
      ]
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: stats()
  };

  return [[null, [classDoc]]];
}
