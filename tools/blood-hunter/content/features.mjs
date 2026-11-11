import {
  DURATION, HEMO_DIE, HEMO_MOD, MODES, activity, damageActivity, damagePart, effect, feat, flagChange, html,
  link, range, recovery, saveActivity, targetCreature, uses, utilityActivity
} from "../lib/helpers.mjs";

const { ADD, CUSTOM, OVERRIDE } = MODES;

export const BRAND_DAMAGE = `${HEMO_MOD} * @scale.blood-hunter.brand-mult`;

export function brandedEffect(seed) {
  return effect(seed, {
    name: "Branded",
    img: "icons/magic/symbols/runes-star-pentagon-orange.webp",
    description: html(`
      This creature bears a blood hunter's Brand of Castigation. Each time it deals damage to the blood hunter or a
      creature the blood hunter can see within 5 feet of them, it takes psychic damage equal to the blood hunter's
      Hemocraft modifier (minimum 1), doubled from 13th level.
    `),
    changes: [["flags.blood-hunter.brandedBy", OVERRIDE, "@actorUuid"]],
    stackable: "none",
    flags: { "blood-hunter": { type: "brand" } }
  });
}

export default function featureDocs() {
  const docs = [];

  /* ---------- 1st level ---------- */

  docs.push(feat("hunters-bane", {
    name: "Hunter's Bane",
    img: "icons/skills/wounds/blood-drip-droplet-red.webp",
    requirements: "Blood Hunter 1",
    description: html(`
      At 1st level, you have survived the Hunter's Bane—a dangerous, long-guarded ritual that alters your life's
      blood, forever binding you to the darkness and honing your senses against it. You have advantage on Wisdom
      (Survival) checks to track fey, fiends, or undead, as well as on Intelligence checks to recall information about
      such creatures.

      The Hunter's Bane also empowers your body to control and shape hemocraft magic, using your own blood and life
      essence to fuel your abilities. Some of your features require your target to make a saving throw to resist the
      feature's effects. The saving throw DC is calculated as follows:

      <p><strong>Hemocraft save DC</strong> = 8 + your proficiency bonus + your Hemocraft modifier (your choice between
      Intelligence or Wisdom)</p>

      <p><em>Automation:</em> <code>@hemocraft.dc</code>, <code>@hemocraft.mod</code> and <code>@hemocraft.die</code>
      are available in formulas. Enable the <strong>Tracking &amp; Lore</strong> effect on this item while tracking or
      recalling lore about fey, fiends, or undead. The always-on effect wires up the Blood Hunter damage bonuses
      (requires Midi-QOL's "Damage Bonus Macro" setting).</p>
    `),
    effects: [
      effect("hunters-bane:automation", {
        name: "Hunter's Bane (Automation)",
        img: "icons/skills/wounds/blood-drip-droplet-red.webp",
        transfer: true,
        showIcon: false,
        changes: [["flags.dnd5e.DamageBonusMacro", CUSTOM, "function.BloodHunter.damageBonus"]]
      }),
      effect("hunters-bane:tracking", {
        name: "Hunter's Bane: Tracking & Lore",
        img: "icons/skills/targeting/crosshair-pointed-orange.webp",
        transfer: true,
        disabled: true,
        changes: [flagChange("advantage.skill.sur"), flagChange("advantage.check.int")]
      })
    ]
  }));

  docs.push(feat("blood-maledict", {
    name: "Blood Maledict",
    img: "icons/magic/unholy/hand-marked-pink.webp",
    requirements: "Blood Hunter 1",
    usesMax: "@scale.blood-hunter.maledict-uses + @hemocraft.maledictBonus",
    recover: [recovery("sr")],
    description: html(`
      Also at 1st level, you gain the ability to channel—or sometimes sacrifice—a part of your vital essence to curse
      and manipulate creatures through hemocraft magic. You know one blood curse of your choice. You learn one
      additional blood curse of your choice at 6th, 10th, 14th, and 18th level. Each time you learn a new blood curse,
      you can also choose one of the blood curses you know and replace it with another blood curse.

      Each time you use your Blood Maledict feature, you choose which curse to invoke from the curses you know. While
      invoking a blood curse, but before it affects the target, you can choose to amplify the curse by taking necrotic
      damage equal to one roll of your hemocraft die. This damage can't be reduced in any way. An amplified curse gains
      an additional effect, noted in the curse's description. Creatures that do not have blood are immune to blood
      curses unless you have amplified the curse.

      Once you use this feature, you must finish a short or long rest before you can use it again. You can use Blood
      Maledict twice between rests starting at 6th level, three times starting at 13th level, and four times starting
      at 17th level.

      <p><em>Automation:</em> each blood curse item spends a use of this feature. Use the curse's
      <strong>Amplified</strong> activity to also pay the hemocraft die in hit points.</p>
    `)
  }));

  /* ---------- 2nd level ---------- */

  docs.push(feat("fighting-style", {
    name: "Fighting Style",
    img: "icons/skills/melee/weapons-crossed-swords-yellow.webp",
    requirements: "Blood Hunter 2",
    description: html(`
      At 2nd level, you adopt a style of fighting as your specialty. Choose one of the following options. You can't
      take a Fighting Style option more than once, even if you later get to choose again.

      - ${link("fs-archery", "Archery")}
      - ${link("fs-dueling", "Dueling")}
      - ${link("fs-great-weapon-fighting", "Great Weapon Fighting")}
      - ${link("fs-two-weapon-fighting", "Two-Weapon Fighting")}
    `)
  }));

  docs.push(feat("crimson-rite", {
    name: "Crimson Rite",
    img: "icons/magic/fire/dagger-rune-enchant-blue-gray.webp",
    requirements: "Blood Hunter 2",
    description: html(`
      Also at 2nd level, you learn to invoke a rite of hemocraft that infuses your weapon strikes with elemental
      energy. As a bonus action, you can activate any rite you know on one weapon you're holding. The effect of the
      rite lasts until you finish a short or long rest. When you activate a rite, you take necrotic damage equal to
      one roll of your hemocraft die. This damage can't be reduced in any way.

      While the rite is in effect, attacks you make with this weapon are magical, and deal extra damage equal to your
      hemocraft die of the type determined by the chosen rite. A weapon can hold only one active rite at a time. Other
      creatures can't gain the benefit of your rite.

      You choose one rite from the crimson rites when you first gain this feature. You learn an additional crimson rite
      at 7th level, and again at 14th level.

      <p><em>Automation:</em> use a rite item and drop the enchantment on a weapon. The rite ends automatically when you
      finish a short or long rest, and applying a new rite replaces any rite already on that weapon.</p>
    `)
  }));

  /* ---------- 3rd level ---------- */

  docs.push(feat("blood-hunter-order", {
    name: "Blood Hunter Order",
    img: "icons/sundries/flags/banner-symbol-sun-gold.webp",
    requirements: "Blood Hunter 3",
    description: html(`
      At 3rd level, you commit to an order of blood hunters whose philosophy will guide you throughout your life: the
      Order of the Ghostslayer, the Order of the Lycan, the Order of the Mutant, or the Order of the Profane Soul. Your
      choice grants you features at 7th level and again at 11th, 15th, and 18th level.
    `)
  }));

  /* ---------- 5th level ---------- */

  docs.push(feat("extra-attack", {
    name: "Extra Attack",
    img: "icons/skills/melee/blade-tips-triple-steel.webp",
    requirements: "Blood Hunter 5",
    description: html(`
      Starting at 5th level, you can attack twice, instead of once, whenever you take the Attack action on your turn.
    `)
  }));

  /* ---------- 6th level ---------- */

  const branded = brandedEffect("brand-of-castigation:branded");
  docs.push(feat("brand-of-castigation", {
    name: "Brand of Castigation",
    img: "icons/magic/symbols/runes-star-pentagon-orange.webp",
    requirements: "Blood Hunter 6",
    usesMax: "1",
    recover: [recovery("sr")],
    description: html(`
      At 6th level, when you damage a creature with a weapon for which you have an active crimson rite, you can channel
      hemocraft magic to sear an arcane brand into that creature (no action required). You always know the direction
      to the branded creature as long as it's on the same plane as you. Further, each time the branded creature deals
      damage to you or a creature you can see within 5 feet of you, the branded creature takes psychic damage equal to
      your Hemocraft modifier (minimum of 1).

      Your brand lasts until you dismiss it or until you use this feature to apply a brand to another creature. Your
      brand can be dispelled with dispel magic, and is treated as a spell with a level equal to half your blood hunter
      level (maximum 9th level).

      Once you use this feature, you can't use it again until you finish a short or long rest.

      <p><em>Automation:</em> after you damage a creature with a rite weapon you'll be prompted to brand it. Branding a
      new creature removes your old brand. Retaliation damage is applied automatically when the branded creature
      damages you or an ally within 5 feet of you; the <strong>Retaliation</strong> activity is a manual fallback.</p>
    `),
    activities: [
      utilityActivity("brand-of-castigation:brand", {
        name: "Brand",
        activation: "none",
        activationCondition: "You damage a creature with a weapon that has an active crimson rite.",
        consume: [uses("", "1")],
        target: targetCreature(),
        rng: range("", "any"),
        effects: [branded._id]
      }),
      damageActivity("brand-of-castigation:retaliation", {
        name: "Retaliation",
        activation: "none",
        activationCondition: "The branded creature damages you or a creature you can see within 5 feet of you.",
        target: targetCreature(),
        rng: range("", "any"),
        damage: [damagePart(BRAND_DAMAGE, "psychic")]
      })
    ],
    effects: [branded]
  }));

  /* ---------- 9th level ---------- */

  docs.push(feat("grim-psychometry", {
    name: "Grim Psychometry",
    img: "icons/magic/perception/eye-ringed-glow-angry-red.webp",
    requirements: "Blood Hunter 9",
    description: html(`
      When you reach 9th level, you gain a supernatural talent for discerning the secrets surrounding mysterious relics
      or places touched by evil. Whenever you make an Intelligence (History) check to recall information about the
      sinister or tragic history of an object you are touching or your current location, you have advantage on the
      check. At the DM's discretion, a suitably high roll might cause your character to experience brief visions of the
      past connected to the object or location.

      <p><em>Automation:</em> enable the effect on this item before making the check.</p>
    `),
    effects: [effect("grim-psychometry:adv", {
      name: "Grim Psychometry",
      img: "icons/magic/perception/eye-ringed-glow-angry-red.webp",
      transfer: true,
      disabled: true,
      changes: [flagChange("advantage.skill.his")]
    })]
  }));

  /* ---------- 10th level ---------- */

  docs.push(feat("dark-augmentation", {
    name: "Dark Augmentation",
    img: "icons/magic/control/silhouette-hold-change-blue.webp",
    requirements: "Blood Hunter 10",
    description: html(`
      Starting at 10th level, the magic of hemocraft suffuses your body to permanently reinforce your resilience. Your
      speed increases by 5 feet, and you have a bonus to Strength, Dexterity, and Constitution saving throws equal to
      your Hemocraft modifier (minimum of +1).
    `),
    effects: [effect("dark-augmentation:passive", {
      name: "Dark Augmentation",
      img: "icons/magic/control/silhouette-hold-change-blue.webp",
      transfer: true,
      showIcon: false,
      changes: [
        ["system.attributes.movement.walk", ADD, "5"],
        ["system.abilities.str.bonuses.save", ADD, `+ ${HEMO_MOD}`],
        ["system.abilities.dex.bonuses.save", ADD, `+ ${HEMO_MOD}`],
        ["system.abilities.con.bonuses.save", ADD, `+ ${HEMO_MOD}`]
      ]
    })]
  }));

  /* ---------- 13th level ---------- */

  docs.push(feat("brand-of-tethering", {
    name: "Brand of Tethering",
    img: "icons/magic/control/debuff-chains-shackle-movement-red.webp",
    requirements: "Blood Hunter 13",
    description: html(`
      Starting at 13th level, the psychic damage from your Brand of Castigation increases to twice your Hemocraft
      modifier (minimum of 2). Additionally, a branded creature can't take the Dash action, and if it attempts to
      teleport or to leave its current plane by any means, it takes 4d6 psychic damage and must make a Wisdom saving
      throw. On a failure, the attempt to teleport or leave the plane fails.

      <p><em>Automation:</em> brand damage doubles automatically. Use the <strong>Tether</strong> activity when a
      branded creature tries to teleport or leave the plane.</p>
    `),
    activities: [saveActivity("brand-of-tethering:tether", {
      name: "Tether",
      activation: "none",
      activationCondition: "A creature branded by you attempts to teleport or leave its current plane.",
      target: targetCreature(),
      rng: range("", "any"),
      ability: "wis",
      onSave: "full",
      damage: [damagePart("4d6", "psychic")]
    })]
  }));

  /* ---------- 14th level ---------- */

  docs.push(feat("hardened-soul", {
    name: "Hardened Soul",
    img: "icons/magic/defensive/shield-barrier-glowing-triangle-red.webp",
    requirements: "Blood Hunter 14",
    description: html(`
      When you reach 14th level, you have advantage on saving throws against being charmed and frightened.
    `),
    effects: [effect("hardened-soul:passive", {
      name: "Hardened Soul",
      img: "icons/magic/defensive/shield-barrier-glowing-triangle-red.webp",
      transfer: true,
      showIcon: false,
      changes: [["flags.blood-hunter.hardenedSoul", ADD, "1"]]
    })]
  }));

  /* ---------- 20th level ---------- */

  docs.push(feat("sanguine-mastery", {
    name: "Sanguine Mastery",
    img: "icons/magic/life/heart-cross-strong-flame-purple-orange.webp",
    requirements: "Blood Hunter 20",
    description: html(`
      Upon reaching 20th level, your mastery of blood magic reaches its height, mitigating your sacrifice and
      empowering your expertise. Once per turn, whenever a blood hunter feature requires you to roll a hemocraft die,
      you can reroll the die and use either roll.

      Additionally, whenever you score a critical hit with a weapon for which you have an active crimson rite, you
      regain one expended use of your Blood Maledict feature.

      <p><em>Automation:</em> the Blood Maledict use is restored automatically on a critical hit with a rite weapon.
      The <strong>Regain Blood Maledict</strong> activity is a manual fallback. The once-per-turn reroll is manual.</p>
    `),
    activities: [utilityActivity("sanguine-mastery:regain", {
      name: "Regain Blood Maledict",
      activation: "none",
      activationCondition: "You score a critical hit with a weapon that has an active crimson rite.",
      consume: [uses("blood-maledict", "-1")]
    })]
  }));

  return [["Class Features", docs]];
}
