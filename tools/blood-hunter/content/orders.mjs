import {
  DURATION, HEMO_MOD, MODES, activity, castActivity, effect, feat, flagChange, healActivity, html, makeId,
  ref, recovery, saveActivity, stats, srdSpell, targetCreature, utilityActivity, uses
} from "../lib/helpers.mjs";

const { ADD, CUSTOM, OVERRIDE } = MODES;

function grant(level, slugs) {
  return {
    _id: makeId(`order-grant-${level}-${slugs.join("-")}`),
    type: "ItemGrant",
    configuration: {
      items: slugs.map(s => ({ uuid: ref(s), optional: false })),
      optional: false,
      spell: { ability: [], preparation: "", uses: { max: "", per: "" } }
    },
    value: {},
    level,
    title: "Features"
  };
}

function subclass(slug, { name, img, description, advancement, spellcasting = null }) {
  return {
    _slug: slug,
    _id: makeId(`subclass:${slug}`),
    name,
    type: "subclass",
    img,
    system: {
      description: { value: html(description), chat: "" },
      source: { custom: "Blood Hunter (Critical Role)", book: "", page: "", license: "", rules: "2014", revision: 1 },
      identifier: slug.replace(/^order-/, ""),
      classIdentifier: "blood-hunter",
      spellcasting: spellcasting ?? { progression: "none", ability: "", preparation: {} },
      advancement
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: stats()
  };
}

function orderFeat(slug, data) {
  return feat(slug, { ...data, type: "class", subtype: "orderFeature" });
}

const PATRONS = [
  ["patron-archfey", "The Archfey", "blur", "slow"],
  ["patron-celestial", "The Celestial", "lesser-restoration", "revivify"],
  ["patron-fathomless", "The Fathomless", "gust-of-wind", "lightning-bolt"],
  ["patron-fiend", "The Fiend", "scorching-ray", "fireball"],
  ["patron-genie", "The Genie", "phantasmal-force", "protection-from-energy"],
  ["patron-great-old-one", "The Great Old One", "detect-thoughts", "haste"],
  ["patron-hexblade", "The Hexblade", "branding-smite", "blink"],
  ["patron-undead", "The Undead", "blindness-deafness", "speak-with-dead"],
  ["patron-undying", "The Undying", "silence", "bestow-curse"]
];

const SPELL_IDS = {
  blur: "UDUnlfPsOAbq2RSE", "lesser-restoration": "F0GsG0SJzsIOacwV", "gust-of-wind": "FSMy6VAjDnXY9vWz",
  "scorching-ray": "7u2obDvuvtZBkTfq", "detect-thoughts": "ppWAAEul0QHtm4er", "branding-smite": "7UwUjJ6owIQkEPrs",
  "blindness-deafness": "zwGsAv6kmwzYGhh3", silence: "5VhqFROQYjr1P9lp", slow: "yqUDoxk4x0NWG5Bz",
  revivify: "LmRHHMtplpxr9fX6", "lightning-bolt": "IyikgTEOTv701jgQ", fireball: "ztgcdrWPshKRpFd0",
  "protection-from-energy": "j8NtLXOOJ3GAKF8I", haste: "Szvk5FEVQW3uhJi5", blink: "GSvLWcdCZLQkilXT",
  "speak-with-dead": "I2LUSF5ogc7Bj62e", "bestow-curse": "pO4zGe5LmFIYqJiL"
};

function spellUuid(key) {
  if ( key === "phantasmal-force" ) return ref("spell-phantasmal-force");
  return srdSpell(SPELL_IDS[key]);
}

function patronFeat([slug, name, revealed, unsealed]) {
  return orderFeat(slug, {
    name: `Otherworldly Patron: ${name}`,
    img: "icons/magic/unholy/orb-glowing-purple.webp",
    requirements: "Blood Hunter 3 (Order of the Profane Soul)",
    description: html(`
      <em>Order of the Profane Soul.</em> You strike a bargain with ${name}. See your order features for Rite Focus,
      Revealed Arcana (${revealed.replace(/-/g, " ")}), and Unsealed Arcana (${unsealed.replace(/-/g, " ")}).
    `),
    activities: [
      castActivity(`${slug}:revealed`, {
        name: "Revealed Arcana", spell: spellUuid(revealed), spellSlot: true, activation: "action",
        activityUses: { spent: 0, max: "1", recovery: [recovery("lr")] }
      }),
      castActivity(`${slug}:unsealed`, {
        name: "Unsealed Arcana", spell: spellUuid(unsealed), spellSlot: false, activation: "action",
        activityUses: { spent: 0, max: "1", recovery: [recovery("lr")] }
      })
    ]
  });
}

export default function orderDocs() {
  const feats = [];
  const subclasses = [];

  feats.push(orderFeat("gs-curse-specialist", {
    name: "Curse Specialist",
    img: "icons/magic/unholy/hand-marked-pink.webp",
    requirements: "Blood Hunter 3 (Order of the Ghostslayer)",
    description: html(`You gain an additional use of your Blood Maledict feature. In addition, your blood curses can target any creature, whether it has blood or not.`),
    effects: [effect("gs-curse-specialist", {
      name: "Curse Specialist", img: "icons/magic/unholy/hand-marked-pink.webp", transfer: true, showIcon: false,
      changes: [["flags.blood-hunter.maledictBonus", ADD, "1"], ["flags.blood-hunter.curseSpecialist", ADD, "1"]]
    })]
  }));

  const aether = effect("gs-aether-walk:active", {
    name: "Aether Walk",
    img: "icons/magic/movement/abstract-ribbons-red-orange.webp",
    duration: { turns: 1 },
    special: ["turnEnd"],
    changes: [["flags.blood-hunter.aetherWalk", ADD, "1"]]
  });
  feats.push(orderFeat("gs-aether-walk", {
    name: "Aether Walk",
    img: "icons/magic/movement/abstract-ribbons-red-orange.webp",
    requirements: "Blood Hunter 7 (Order of the Ghostslayer)",
    usesMax: "@hemocraft.mod",
    recover: [recovery("sr")],
    description: html(`Upon reaching 7th level, at the start of your turn, you can magically step into the veil between the planes. This feature lasts for a number of rounds equal to your Hemocraft modifier (minimum of 1 round). At 15th level you can use Aether Walk twice between rests.`),
    activities: [utilityActivity("gs-aether-walk:activate", { name: "Aether Walk", activation: "none", activationCondition: "Start of your turn", effects: [aether._id] })],
    effects: [aether]
  }));

  feats.push(orderFeat("gs-brand-of-sundering", {
    name: "Brand of Sundering",
    img: "icons/magic/symbols/runes-star-pentagon-orange.webp",
    requirements: "Blood Hunter 11 (Order of the Ghostslayer)",
    description: html(`Whenever you hit a creature with a weapon for which you have an active crimson rite, you roll an additional hemocraft die when determining the extra damage from the rite.`),
    effects: [effect("gs-sundering", {
      name: "Brand of Sundering", transfer: true, showIcon: false,
      img: "icons/magic/symbols/runes-star-pentagon-orange.webp",
      changes: [["flags.blood-hunter.sundering", ADD, "1"]]
    })]
  }));

  feats.push(orderFeat("gs-rite-revival", {
    name: "Rite Revival",
    img: "icons/magic/life/heart-cross-strong-flame-blue.webp",
    requirements: "Blood Hunter 18 (Order of the Ghostslayer)",
    description: html(`If you have one or more crimson rites active and you are reduced to 0 hit points but don't die outright, you can choose to have all your active crimson rites end and drop to 1 hit point instead. <em>Automation:</em> handled by the module when you reach 0 HP.`)
  }));

  feats.push(orderFeat("ly-heightened-senses", {
    name: "Heightened Senses",
    img: "icons/magic/perception/eye-ringed-glow-angry-red.webp",
    requirements: "Blood Hunter 3 (Order of the Lycan)",
    description: html(`You have advantage on Wisdom (Perception) checks that rely on hearing or smell.`),
    effects: [effect("ly-senses", {
      name: "Heightened Senses", transfer: true, img: "icons/magic/perception/eye-ringed-glow-angry-red.webp",
      changes: [flagChange("advantage.skill.prc")]
    })]
  }));

  const hybrid = effect("ly-hybrid-form", {
    name: "Hybrid Transformation",
    img: "icons/creatures/mammals/wolf-howl-moon-gray.webp",
    duration: { seconds: 3600 },
    special: ["shortRest", "longRest"],
    changes: [
      flagChange("advantage.check.str"), flagChange("advantage.save.str"),
      ["system.bonuses.mwak.damage", ADD, "+ 1"],
      ["system.traits.dr.value", ADD, "bludgeoning"], ["system.traits.dr.value", ADD, "piercing"], ["system.traits.dr.value", ADD, "slashing"],
      ["system.attributes.ac.bonus", ADD, "+ 1"],
      ["flags.blood-hunter.lycanHybrid", ADD, "1"]
    ]
  });
  feats.push(orderFeat("ly-hybrid-transformation", {
    name: "Hybrid Transformation",
    img: "icons/creatures/mammals/wolf-howl-moon-gray.webp",
    requirements: "Blood Hunter 3 (Order of the Lycan)",
    usesMax: "1",
    recover: [recovery("sr")],
    description: html(`As a bonus action, transform into a hybrid form for up to 1 hour. See the class text for Predatory Strikes, Bloodlust, and scaling at 11th and 18th level.`),
    activities: [utilityActivity("ly-hybrid:toggle", { name: "Hybrid Transformation", activation: "bonus", consume: [uses("", "1")], effects: [hybrid._id], midi: { toggleEffect: true } })],
    effects: [hybrid]
  }));

  feats.push(orderFeat("ly-stalkers-prowess", {
    name: "Stalker's Prowess",
    img: "icons/magic/movement/trail-streak-zigzag-yellow.webp",
    requirements: "Blood Hunter 7 (Order of the Lycan)",
    description: html(`Your speed increases by 10 feet. While in hybrid form you gain +1 to unarmed attack rolls (scaling at 11th and 18th).`),
    effects: [effect("ly-stalker", {
      name: "Stalker's Prowess", transfer: true, showIcon: false,
      img: "icons/magic/movement/trail-streak-zigzag-yellow.webp",
      changes: [["system.attributes.movement.walk", ADD, "10"], ["flags.blood-hunter.stalkerProwess", ADD, "1"]]
    })]
  }));

  feats.push(orderFeat("ly-advanced-transformation", {
    name: "Advanced Transformation",
    img: "icons/creatures/mammals/wolf-howl-moon-gray.webp",
    requirements: "Blood Hunter 11 (Order of the Lycan)",
    description: html(`You can use Hybrid Transformation twice between rests. Lycan Regeneration is handled at the start of your turn by the module while in hybrid form.`),
    effects: [effect("ly-advanced", {
      name: "Advanced Transformation", transfer: true, showIcon: false,
      changes: [["flags.blood-hunter.lycanRegen", ADD, "1"]]
    })]
  }));

  feats.push(orderFeat("ly-brand-voracious", {
    name: "Brand of the Voracious",
    img: "icons/magic/symbols/runes-star-pentagon-orange.webp",
    requirements: "Blood Hunter 15 (Order of the Lycan)",
    description: html(`You have advantage on the saving throw for your bloodlust while in hybrid form. While in hybrid form, you have advantage on attack rolls against a creature branded by you.`),
    effects: [effect("ly-voracious", {
      name: "Brand of the Voracious", transfer: true, showIcon: false,
      changes: [["flags.blood-hunter.brandVoracious", ADD, "1"]]
    })]
  }));

  feats.push(orderFeat("ly-hybrid-mastery", {
    name: "Hybrid Transformation Mastery",
    img: "icons/creatures/mammals/wolf-howl-moon-gray.webp",
    requirements: "Blood Hunter 18 (Order of the Lycan)",
    description: html(`You can use Hybrid Transformation an unlimited number of times. You gain the Blood Curse of the Howl (granted separately at this level).`)
  }));

  feats.push(orderFeat("mu-mutagencraft", {
    name: "Mutagencraft",
    img: "icons/skills/toxins/cauldron-bubbles-overflow-green.webp",
    requirements: "Blood Hunter 3 (Order of the Mutant)",
    description: html(`You learn mutagen formulas from the Mutagens compendium. Concot one mutagen when you finish a short or long rest; formulas increase with level.`)
  }));

  feats.push(orderFeat("mu-strange-metabolism", {
    name: "Strange Metabolism",
    img: "icons/magic/life/heart-cross-strong-green.webp",
    requirements: "Blood Hunter 7 (Order of the Mutant)",
    usesMax: "1",
    recover: [recovery("lr")],
    description: html(`Immunity to poison damage and the poisoned condition. As a bonus action, ignore the negative side effect of one mutagen affecting you for 1 minute (once per long rest).`),
    effects: [effect("mu-metabolism", {
      name: "Strange Metabolism", transfer: true, showIcon: false,
      changes: [
        ["system.traits.di.value", ADD, "poison"],
        ["system.traits.ci.value", ADD, "poisoned"]
      ]
    })],
    activities: [utilityActivity("mu-metabolism:purge", { name: "Ignore Mutagen Side Effect", activation: "bonus", consume: [uses("", "1")] })]
  }));

  feats.push(orderFeat("mu-brand-axiom", {
    name: "Brand of Axiom",
    img: "icons/magic/symbols/runes-star-pentagon-orange.webp",
    requirements: "Blood Hunter 11 (Order of the Mutant)",
    description: html(`Illusions and invisibility on a branded creature end when you brand it. Shapeshifters must save or revert and be stunned. <em>Automation:</em> manual with save activity when branding.`),
    activities: [saveActivity("mu-brand-axiom:revert", {
      name: "Force True Form",
      activation: "none",
      activationCondition: "When you brand a creature in an alternative form.",
      ability: "wis", onSave: "full",
      target: targetCreature(), rng: { units: "any", special: "" }
    })]
  }));

  feats.push(orderFeat("mu-exalted-mutation", {
    name: "Exalted Mutation",
    img: "icons/skills/toxins/cauldron-bubbles-overflow-green.webp",
    requirements: "Blood Hunter 18 (Order of the Mutant)",
    usesMax: HEMO_MOD,
    recover: [recovery("lr")],
    description: html(`As a bonus action, end one mutagen's effects and immediately consume another mutagen you know.`),
    activities: [utilityActivity("mu-exalted:swap", { name: "Exalted Mutation", activation: "bonus", consume: [uses("", "1")] })]
  }));

  feats.push(orderFeat("ps-pact-magic", {
    name: "Pact Magic",
    img: "icons/magic/unholy/orb-glowing-purple.webp",
    requirements: "Blood Hunter 3 (Order of the Profane Soul)",
    description: html(`You augment your combat techniques with warlock spellcasting using pact slots on the character sheet. Hemocraft ability is your spellcasting ability.`)
  }));

  feats.push(orderFeat("ps-mystic-frenzy", {
    name: "Mystic Frenzy",
    img: "icons/magic/unholy/projectile-fireball-green.webp",
    requirements: "Blood Hunter 7 (Order of the Profane Soul)",
    description: html(`When you use your action to cast a cantrip, you can immediately make one weapon attack as a bonus action.`)
  }));

  feats.push(orderFeat("ps-brand-sapping", {
    name: "Brand of the Sapping Scar",
    img: "icons/magic/symbols/runes-star-pentagon-orange.webp",
    requirements: "Blood Hunter 11 (Order of the Profane Soul)",
    description: html(`A creature branded by you has disadvantage on saving throws against your warlock spells.`),
    effects: [effect("ps-sapping", {
      name: "Sapping Scar (on branded target)", transfer: false,
      changes: [flagChange("disadvantage.save.all")]
    })]
  }));

  feats.push(orderFeat("ps-rite-focus", {
    name: "Rite Focus",
    img: "icons/magic/fire/dagger-rune-enchant-blue-gray.webp",
    requirements: "Blood Hunter 3 (Order of the Profane Soul)",
    description: html(`While you have an active crimson rite, you can use your weapon as a spellcasting focus. Patron-specific benefits are on each patron item.`)
  }));

  const patronFeats = PATRONS.map(patronFeat);
  feats.push(...patronFeats);

  subclasses.push(subclass("order-ghostslayer", {
    name: "Order of the Ghostslayer",
    img: "icons/magic/holy/sword-glow-holy-white.webp",
    description: `The oldest blood hunter order, dedicated to destroying undeath.`,
    advancement: [
      grant(3, ["rite-dawn", "gs-curse-specialist"]),
      grant(7, ["gs-aether-walk"]),
      grant(11, ["gs-brand-of-sundering"]),
      grant(15, ["curse-exorcist"]),
      grant(18, ["gs-rite-revival"])
    ]
  }));

  subclasses.push(subclass("order-lycan", {
    name: "Order of the Lycan",
    img: "icons/creatures/mammals/wolf-howl-moon-gray.webp",
    description: `Blood hunters who harness lycanthropy through the Taming.`,
    advancement: [
      grant(3, ["ly-heightened-senses", "ly-hybrid-transformation"]),
      grant(7, ["ly-stalkers-prowess"]),
      grant(11, ["ly-advanced-transformation"]),
      grant(15, ["ly-brand-voracious"]),
      grant(18, ["curse-howl", "ly-hybrid-mastery"])
    ]
  }));

  subclasses.push(subclass("order-mutant", {
    name: "Order of the Mutant",
    img: "icons/skills/toxins/cauldron-bubbles-overflow-green.webp",
    description: `Alchemical mutagens alter body and mind for battle.`,
    advancement: [
      grant(3, ["mu-mutagencraft"]),
      grant(7, ["mu-strange-metabolism"]),
      grant(11, ["mu-brand-axiom"]),
      grant(15, ["curse-corrosion"]),
      grant(18, ["mu-exalted-mutation"])
    ]
  }));

  subclasses.push(subclass("order-profane-soul", {
    name: "Order of the Profane Soul",
    img: "icons/magic/unholy/orb-glowing-purple.webp",
    description: `Hemocraft blended with warlock pact magic.`,
    spellcasting: { progression: "profaneSoul", ability: "int", preparation: {} },
    advancement: [
      {
        _id: makeId("ps-patron-choice"),
        type: "ItemChoice",
        configuration: {
          choices: { 3: { count: 1, replacement: false } },
          allowDrops: false,
          type: "feat",
          pool: PATRONS.map(([slug]) => ({ uuid: ref(slug) })),
          restriction: { type: "feat", subtype: "", level: null }
        },
        value: { added: {}, replaced: {} },
        level: 3,
        title: "Otherworldly Patron"
      },
      grant(3, ["ps-pact-magic", "ps-rite-focus"]),
      grant(7, ["ps-mystic-frenzy"]),
      grant(11, ["ps-brand-sapping"]),
      grant(18, ["curse-soul-eater"])
    ]
  }));

  const byId = id => subclasses.find(s => s.system.identifier === id);
  return [
    ["Ghostslayer", [byId("ghostslayer"), ...feats.filter(f => f.system.identifier.startsWith("gs-"))]],
    ["Lycan", [byId("lycan"), ...feats.filter(f => f.system.identifier.startsWith("ly-"))]],
    ["Mutant", [byId("mutant"), ...feats.filter(f => f.system.identifier.startsWith("mu-"))]],
    ["Profane Soul", [byId("profane-soul"), ...feats.filter(f => f.system.identifier.startsWith("ps-") || f.system.identifier.startsWith("patron-"))]]
  ];
}
