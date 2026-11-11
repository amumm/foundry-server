import { DURATION, MODES, effect, feat, flagChange, html, utilityActivity } from "../lib/helpers.mjs";

const { ADD, OVERRIDE, UPGRADE } = MODES;

function mutagen(slug, { name, img, description, requirements = "", changes = [], duration = DURATION.rest }) {
  const eff = effect(`mutagen-${slug}`, {
    name,
    img,
    ...duration,
    changes
  });
  return feat(`mutagen-${slug}`, {
    name,
    img,
    subtype: "mutagen",
    requirements,
    description: html(description),
    effects: [eff],
    activities: [
      utilityActivity(`mutagen-${slug}:consume`, {
        name: "Consume",
        activation: "bonus",
        effects: [eff._id],
        midi: { toggleEffect: true, displayActivityName: true }
      })
    ]
  });
}

const scoreBoost = (ability, levels = { 3: 3, 11: 4, 18: 5 }) => {
  const lines = Object.entries(levels).map(([lvl, val]) =>
    `Your ${ability} score increases by ${val}${Number(lvl) > 3 ? ` if you consume this mutagen at ${lvl}th level` : ""}, as does your maximum for that score.`
  );
  return lines.join(" ");
};

export default function mutagenDocs() {
  const docs = [
    mutagen("aether", {
      name: "Aether", requirements: "Blood Hunter 11 (Order of the Mutant)",
      img: "icons/magic/air/wind-tornado-wall-blue.webp",
      description: `${scoreBoost("Dexterity", { 11: 3 })} You have a flying speed of 20 feet for 1 hour. However, you have disadvantage on Strength checks and Dexterity checks during this time.`,
      changes: [
        ["system.attributes.movement.fly", ADD, "20"],
        flagChange("disadvantage.check.str"),
        flagChange("disadvantage.check.dex")
      ],
      duration: { duration: { seconds: 3600 }, special: ["shortRest", "longRest"] }
    }),
    mutagen("alluring", {
      name: "Alluring", img: "icons/magic/control/mouth-smile-deception-purple.webp",
      description: `Your skin and voice become malleable, allowing you to enhance your appearance and presence. You have advantage on Charisma checks. However, you have disadvantage on initiative rolls.`,
      changes: [flagChange("advantage.check.cha"), flagChange("disadvantage.initiative")]
    }),
    mutagen("celerity", {
      name: "Celerity", img: "icons/magic/movement/trail-streak-zigzag-teal.webp",
      description: `${scoreBoost("Dexterity")} However, you have disadvantage on Wisdom saving throws.`,
      changes: [
        ["system.abilities.dex.value", ADD, "3"],
        ["system.abilities.dex.max", ADD, "3"],
        flagChange("disadvantage.save.wis")
      ]
    }),
    mutagen("conversant", {
      name: "Conversant", img: "icons/magic/symbols/runes-star-pentagon-blue.webp",
      description: `You have advantage on Intelligence checks. However, you have disadvantage on Wisdom checks.`,
      changes: [flagChange("advantage.check.int"), flagChange("disadvantage.check.wis")]
    }),
    mutagen("cruelty", {
      name: "Cruelty", requirements: "Blood Hunter 11 (Order of the Mutant)",
      img: "icons/skills/melee/strike-slashes-orange.webp",
      description: `When you use the Attack action, you can make one additional weapon attack as a bonus action. However, you have disadvantage on Intelligence, Wisdom, and Charisma saving throws.`,
      changes: [
        ["flags.blood-hunter.mutagenCruelty", ADD, "1"],
        flagChange("disadvantage.save.int"),
        flagChange("disadvantage.save.wis"),
        flagChange("disadvantage.save.cha")
      ]
    }),
    mutagen("deftness", {
      name: "Deftness", img: "icons/magic/movement/trail-streak-zigzag-yellow.webp",
      description: `You have advantage on Dexterity checks. However, you have disadvantage on Wisdom checks.`,
      changes: [flagChange("advantage.check.dex"), flagChange("disadvantage.check.wis")]
    }),
    mutagen("embers", {
      name: "Embers", img: "icons/magic/fire/flame-burning-hand-orange.webp",
      description: `You have resistance to fire damage and vulnerability to cold damage.`,
      changes: [["system.traits.dr.value", ADD, "fire"], ["system.traits.dv.value", ADD, "cold"]]
    }),
    mutagen("gelid", {
      name: "Gelid", img: "icons/magic/water/snowflake-ice-blue.webp",
      description: `You have resistance to cold damage and vulnerability to fire damage.`,
      changes: [["system.traits.dr.value", ADD, "cold"], ["system.traits.dv.value", ADD, "fire"]]
    }),
    mutagen("impermeable", {
      name: "Impermeable", img: "icons/magic/defensive/shield-barrier-deflect-teal.webp",
      description: `You have resistance to piercing damage and vulnerability to slashing damage.`,
      changes: [["system.traits.dr.value", ADD, "piercing"], ["system.traits.dv.value", ADD, "slashing"]]
    }),
    mutagen("mobility", {
      name: "Mobility", img: "icons/magic/movement/abstract-ribbons-red-orange.webp",
      description: `You have immunity to the grappled and restrained conditions. However, you have disadvantage on Strength checks. At 11th level, you are also immune to the paralyzed condition.`,
      changes: [
        ["system.traits.ci.value", ADD, "grappled"],
        ["system.traits.ci.value", ADD, "restrained"],
        flagChange("disadvantage.check.str"),
        ["flags.blood-hunter.mutagenMobility", ADD, "1"]
      ]
    }),
    mutagen("nighteye", {
      name: "Nighteye", img: "icons/magic/perception/eye-slit-orange.webp",
      description: `You have darkvision out to a range of 60 feet. If you already have darkvision, its range increases by 60 feet. However, you have disadvantage on attack rolls and on Wisdom (Perception) checks that rely on sight when you, the target of your attack, or whatever you are trying to perceive is in direct sunlight.`,
      changes: [["system.attributes.senses.darkvision", ADD, "60"]]
    }),
    mutagen("percipient", {
      name: "Percipient", img: "icons/magic/perception/third-eye-blue-red.webp",
      description: `You have advantage on Wisdom checks. However, you have disadvantage on Charisma checks.`,
      changes: [flagChange("advantage.check.wis"), flagChange("disadvantage.check.cha")]
    }),
    mutagen("potency", {
      name: "Potency", img: "icons/magic/control/strength-muscle-damage-orange.webp",
      description: `${scoreBoost("Strength")} However, you have disadvantage on Dexterity saving throws.`,
      changes: [
        ["system.abilities.str.value", ADD, "3"],
        ["system.abilities.str.max", ADD, "3"],
        flagChange("disadvantage.save.dex")
      ]
    }),
    mutagen("precision", {
      name: "Precision", requirements: "Blood Hunter 11 (Order of the Mutant)",
      img: "icons/skills/ranged/target-bullseye-arrow-green.webp",
      description: `Your weapon attacks score a critical hit on a roll of 19 or 20. However, you have disadvantage on Strength saving throws.`,
      changes: [["flags.midi-qol.critical.threshold", OVERRIDE, "19"], flagChange("disadvantage.save.str")]
    }),
    mutagen("rapidity", {
      name: "Rapidity", img: "icons/magic/movement/trail-streak-zigzag-yellow.webp",
      description: `Your speed increases by 10 feet. However, you have disadvantage on Intelligence checks. At 15th level, your speed increases by an additional 5 feet.`,
      changes: [
        ["system.attributes.movement.walk", ADD, "10"],
        flagChange("disadvantage.check.int"),
        ["flags.blood-hunter.mutagenRapidity", ADD, "1"]
      ]
    }),
    mutagen("reconstruction", {
      name: "Reconstruction", requirements: "Blood Hunter 7 (Order of the Mutant)",
      img: "icons/magic/life/cross-worn-green.webp",
      description: `For 1 hour, at the start of each of your turns when you have at least 1 hit point but fewer hit points than half your hit point maximum, you regain hit points equal to your proficiency bonus. However, your speed is reduced by 10 feet during this time.`,
      changes: [
        ["flags.blood-hunter.mutagenReconstruction", ADD, "1"],
        ["system.attributes.movement.walk", ADD, "-10"]
      ],
      duration: { duration: { seconds: 3600 }, special: ["shortRest", "longRest"] }
    }),
    mutagen("sagacity", {
      name: "Sagacity", img: "icons/magic/symbols/runes-star-pentagon-blue.webp",
      description: `${scoreBoost("Intelligence")} However, you have disadvantage on Charisma saving throws.`,
      changes: [
        ["system.abilities.int.value", ADD, "3"],
        ["system.abilities.int.max", ADD, "3"],
        flagChange("disadvantage.save.cha")
      ]
    }),
    mutagen("shielded", {
      name: "Shielded", img: "icons/magic/defensive/shield-barrier-blue.webp",
      description: `You have resistance to slashing damage, and you have vulnerability to bludgeoning damage.`,
      changes: [["system.traits.dr.value", ADD, "slashing"], ["system.traits.dv.value", ADD, "bludgeoning"]]
    }),
    mutagen("unbreakable", {
      name: "Unbreakable", img: "icons/magic/defensive/shield-barrier-glowing-triangle-orange.webp",
      description: `You have resistance to bludgeoning damage, and you have vulnerability to piercing damage.`,
      changes: [["system.traits.dr.value", ADD, "bludgeoning"], ["system.traits.dv.value", ADD, "piercing"]]
    }),
    mutagen("vermillion", {
      name: "Vermillion", img: "icons/magic/unholy/orb-swirling-teal.webp",
      description: `You gain an additional use of your Blood Maledict feature. However, you have disadvantage on death saving throws.`,
      changes: [
        ["flags.blood-hunter.maledictBonus", ADD, "1"],
        flagChange("disadvantage.deathSave")
      ]
    })
  ];

  return [["Mutagens", docs]];
}
