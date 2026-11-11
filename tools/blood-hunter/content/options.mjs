import { MODES, effect, feat, flagChange, html, itemId, saveActivity, stats } from "../lib/helpers.mjs";

const { ADD, CUSTOM } = MODES;

export default function optionDocs() {
  const docs = [];

  docs.push(feat("variant-hemocraft-wisdom", {
    name: "Variant Hemocraft (Wisdom)",
    img: "icons/magic/perception/third-eye-blue-red.webp",
    type: "class",
    subtype: "optionalFeature",
    requirements: "Blood Hunter (with DM permission)",
    description: html(`
      With your DM's permission, you can choose to use your Wisdom modifier for all your blood hunter features that use
      your Intelligence modifier by default, including hemocraft save DCs and pact spellcasting.

      <p><em>Automation:</em> drag this item onto your character sheet and enable the effect. If you are a Profane Soul,
      also set your subclass item's spellcasting ability to Wisdom.</p>
    `),
    effects: [effect("variant-hemocraft-wisdom", {
      name: "Hemocraft: Wisdom",
      img: "icons/magic/perception/third-eye-blue-red.webp",
      transfer: true,
      changes: [["flags.blood-hunter.hemocraftAbility", ADD, "wis"]]
    })]
  }));

  docs.push(feat("fs-archery", {
    name: "Archery",
    img: "icons/skills/ranged/arrows-flying-triple-yellow.webp",
    subtype: "fightingStyle",
    requirements: "Blood Hunter 2",
    description: html(`You gain a +2 bonus to attack rolls you make with ranged weapons.`),
    effects: [effect("fs-archery", {
      name: "Archery",
      img: "icons/skills/ranged/arrows-flying-triple-yellow.webp",
      transfer: true,
      changes: [["system.bonuses.rwak.attack", ADD, "+ 2"]]
    })]
  }));

  docs.push(feat("fs-dueling", {
    name: "Dueling",
    img: "icons/skills/melee/sword-damaged-broken-orange.webp",
    subtype: "fightingStyle",
    requirements: "Blood Hunter 2",
    description: html(`
      When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with
      that weapon.
    `),
    effects: [effect("fs-dueling", {
      name: "Dueling",
      img: "icons/skills/melee/sword-damaged-broken-orange.webp",
      transfer: true,
      changes: [["flags.blood-hunter.dueling", ADD, "1"]]
    })]
  }));

  docs.push(feat("fs-great-weapon-fighting", {
    name: "Great Weapon Fighting",
    img: "icons/skills/melee/strike-sword-steel-yellow.webp",
    subtype: "fightingStyle",
    requirements: "Blood Hunter 2",
    description: html(`
      When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two
      hands, you can reroll the die and must use the new roll, even if the new roll is a 1 or a 2. The weapon must have
      the two-handed or versatile property for you to gain this benefit.

      <p><em>Automation:</em> rerolls 1s and 2s on qualifying two-handed melee weapon damage (module script).</p>
    `),
    effects: [effect("fs-gwf", {
      name: "Great Weapon Fighting",
      img: "icons/skills/melee/strike-sword-steel-yellow.webp",
      transfer: true,
      changes: [["flags.blood-hunter.greatWeaponFighting", ADD, "1"]]
    })]
  }));

  docs.push(feat("fs-two-weapon-fighting", {
    name: "Two-Weapon Fighting",
    img: "icons/skills/melee/weapons-crossed-swords-white-blue.webp",
    subtype: "fightingStyle",
    requirements: "Blood Hunter 2",
    description: html(`
      When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.

      <p><em>Automation:</em> adds your ability modifier to off-hand weapon damage (module script).</p>
    `),
    effects: [effect("fs-twf", {
      name: "Two-Weapon Fighting",
      img: "icons/skills/melee/weapons-crossed-swords-white-blue.webp",
      transfer: true,
      changes: [["flags.blood-hunter.twoWeaponFighting", ADD, "1"]]
    })]
  }));

  const pfAct = saveActivity("spell-pf:save", {
    name: "Cast",
    activation: "action",
    ability: "int",
    onSave: "half",
    damage: [{
      number: 1, denomination: 6, types: ["psychic"],
      custom: { enabled: false, formula: "" }, bonus: "",
      scaling: { mode: "", number: null, formula: "" }
    }],
    duration: { concentration: true, value: "1", units: "minute" }
  });
  docs.push({
    _slug: "spell-phantasmal-force",
    _id: itemId("spell-phantasmal-force"),
    name: "Phantasmal Force",
    type: "spell",
    img: "icons/magic/control/hypnosis-mesmerism-eye.webp",
    system: {
      description: {
        value: html(`
          <em>Home summary (not in the SRD).</em> You craft an illusion in a creature's mind. One creature you can see within
          range must succeed on an Intelligence saving throw or perceive a phantasmal object, creature, or phenomenon. The
          target takes 1d6 psychic damage at the end of each of its turns if it is still affected.
        `),
        chat: ""
      },
      source: { custom: "Blood Hunter module (Genie patron)", book: "", page: "", license: "", rules: "2014", revision: 1 },
      identifier: "phantasmal-force",
      level: 2,
      school: "ill",
      components: { vocal: true, somatic: true, material: true, ritual: false, concentration: true },
      materials: { value: "a bit of fleece", consumed: false, cost: 0, supply: 0 },
      preparation: { mode: "prepared", prepared: false },
      activities: { [pfAct._id]: pfAct },
      properties: ["vocal", "somatic", "material", "concentration"]
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: stats()
  });

  return [["Options", docs]];
}
