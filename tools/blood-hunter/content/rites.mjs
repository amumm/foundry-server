import {
  HEMO_DIE, MODES, activity, effect, feat, html, hpCost, merge, targetSelf
} from "../lib/helpers.mjs";

const { ADD, OVERRIDE } = MODES;

function riteFeat(slug, { name, img, damageType, titleSuffix, requirements = "Blood Hunter 2", description }) {
  const ench = effect(`rite-${slug}:enchant`, {
    name: `${name} (Enchantment)`,
    img,
    type: "enchantment",
    transfer: false,
    duration: { seconds: null },
    flags: {
      dnd5e: { enchantment: { riders: { effect: [], item: [] } } },
      "blood-hunter": { rite: slug, damageType }
    },
    changes: [
      ["system.properties", ADD, "mgc"],
      ["system.damage.parts", ADD, `[[\"${HEMO_DIE}\",\"${damageType}\"]]`],
      ["name", OVERRIDE, `{} (${titleSuffix})`]
    ]
  });

  const act = activity(`rite-${slug}:activate`, "enchant", {
    name: "Activate Rite",
    activation: "bonus",
    consume: [hpCost()],
    target: targetSelf(),
    extra: {
      enchant: { identifier: "" },
      restrictions: { type: "weapon", allowMagical: false, categories: [], properties: [] },
      effects: [{ _id: ench._id, riders: { effect: [], item: [] } }]
    }
  });

  return feat(`rite-${slug}`, {
    name,
    img,
    subtype: "crimsonRite",
    requirements,
    description: html(description),
    activities: [act],
    effects: [ench]
  });
}

export default function riteDocs() {
  const docs = [
    riteFeat("flame", {
      name: "Rite of the Flame",
      img: "icons/magic/fire/dagger-rune-enchant-blue-gray.webp",
      damageType: "fire",
      titleSuffix: "Rite of the Flame",
      description: `The extra damage dealt by your rite is fire damage.`
    }),
    riteFeat("frozen", {
      name: "Rite of the Frozen",
      img: "icons/magic/water/snowflake-ice-blue.webp",
      damageType: "cold",
      titleSuffix: "Rite of the Frozen",
      description: `The extra damage dealt by your rite is cold damage.`
    }),
    riteFeat("storm", {
      name: "Rite of the Storm",
      img: "icons/magic/lightning/bolt-strike-blue.webp",
      damageType: "lightning",
      titleSuffix: "Rite of the Storm",
      description: `The extra damage dealt by your rite is lightning damage.`
    }),
    riteFeat("dead", {
      name: "Rite of the Dead",
      img: "icons/magic/death/skull-flames-white-blue.webp",
      damageType: "necrotic",
      titleSuffix: "Rite of the Dead",
      requirements: "Blood Hunter 14",
      description: `<em>Prerequisite: 14th level.</em> The extra damage dealt by your rite is necrotic damage.`
    }),
    riteFeat("oracle", {
      name: "Rite of the Oracle",
      img: "icons/magic/perception/third-eye-blue-red.webp",
      damageType: "psychic",
      titleSuffix: "Rite of the Oracle",
      requirements: "Blood Hunter 14",
      description: `<em>Prerequisite: 14th level.</em> The extra damage dealt by your rite is psychic damage.`
    }),
    riteFeat("roar", {
      name: "Rite of the Roar",
      img: "icons/magic/sonic/explosion-shock-sound-wave.webp",
      damageType: "thunder",
      titleSuffix: "Rite of the Roar",
      requirements: "Blood Hunter 14",
      description: `<em>Prerequisite: 14th level.</em> The extra damage dealt by your rite is thunder damage.`
    }),
    riteFeat("dawn", {
      name: "Rite of the Dawn",
      img: "icons/magic/light/explosion-star-glow-silhouette.webp",
      damageType: "radiant",
      titleSuffix: "Rite of the Dawn",
      requirements: "Blood Hunter 3 (Order of the Ghostslayer)",
      description: `
        <em>Order of the Ghostslayer.</em> When you activate the Rite of the Dawn, the extra damage dealt by your rite is
        radiant damage. Additionally, while that rite is active on your weapon, you gain the following benefits:

        - Your weapon sheds bright light out to a range of 20 feet.
        - You have resistance to necrotic damage.
        - When you hit an undead creature with a weapon for which the Rite of the Dawn is active, you roll an additional
          hemocraft die when determining the extra damage from the rite.

        <p><em>Automation:</em> enable the rider effects on the rite enchantment while it is active.</p>`
    })
  ];

  // Dawn rider effects are separate transfer effects referenced by the enchantment riders
  const dawnItem = docs.find(d => d.system.identifier === "rite-dawn");
  dawnItem.effects[0].flags = merge(dawnItem.effects[0].flags, { "blood-hunter": { rite: "dawn", dawn: true } });

  return [["Crimson Rites", docs]];
}
