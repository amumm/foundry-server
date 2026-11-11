import {
  DURATION, HEMO_DIE, MODES, activity, damageActivity, damagePart, effect, feat, flagChange, html, hpCost,
  range, saveActivity, targetCreature, useMaledict
} from "../lib/helpers.mjs";

const { OVERRIDE, CUSTOM } = MODES;

function curse(slug, { name, img, description, requirements = "Blood Hunter", activities = [], effects = [] }) {
  return feat(`curse-${slug}`, {
    name,
    img,
    subtype: "bloodCurse",
    requirements,
    description: html(description),
    activities,
    effects
  });
}

function maledictActs(seed, { normal = null, amplified = null }) {
  const acts = [];
  const add = (suffix, def, amplified) => {
    const data = {
      name: def.name ?? (amplified ? "Amplified" : "Invoke"),
      activation: def.activation ?? "bonus",
      consume: [useMaledict(), ...(amplified ? [hpCost()] : []), ...(def.extraConsume ?? [])],
      ...def
    };
    delete data.kind;
    delete data.extraConsume;
    const id = `${seed}:${suffix}`;
    if ( def.kind === "save" ) acts.push(saveActivity(id, data));
    else if ( def.kind === "damage" ) acts.push(damageActivity(id, data));
    else acts.push(activity(id, def.type ?? "utility", data));
  };
  if ( normal ) add("normal", normal, false);
  if ( amplified ) add("amplify", amplified, true);
  return acts;
}

export default function curseDocs() {
  const docs = [];

  const anxiousAdv = effect("curse-anxious:adv", {
    name: "Blood Curse of the Anxious",
    img: "icons/magic/control/fear-fright-white.webp",
    ...DURATION.untilSourceTurnEnd,
    changes: [flagChange("grants.advantage.skill.itm")]
  });
  const anxiousAmp = effect("curse-anxious:amp", {
    name: "Anxious (Amplified)",
    img: "icons/magic/control/fear-fright-white.webp",
    ...DURATION.untilSourceTurnEnd,
    changes: [flagChange("disadvantage.save.wis")]
  });
  docs.push(curse("anxious", {
    name: "Blood Curse of the Anxious",
    img: "icons/magic/control/fear-fright-white.webp",
    description: `
      As a bonus action, you harry the body or mind of a creature within 30 feet of you, making them susceptible to
      forceful influence. Until the end of your next turn, Charisma (Intimidation) checks made against the cursed
      creature have advantage.

      <strong>Amplify.</strong> The next Wisdom saving throw the cursed creature makes before this curse ends has
      disadvantage.`,
    activities: maledictActs("curse-anxious", {
      normal: { target: targetCreature(), rng: range(30), effects: [anxiousAdv._id] },
      amplified: { target: targetCreature(), rng: range(30), effects: [anxiousAdv._id, anxiousAmp._id] }
    }),
    effects: [anxiousAdv, anxiousAmp]
  }));

  const binding = effect("curse-binding:bound", {
    name: "Blood Curse of Binding",
    img: "icons/magic/control/debuff-chains-shackle-movement-red.webp",
    ...DURATION.untilSourceTurnEnd,
    changes: [
      ["system.attributes.movement.walk", OVERRIDE, "0"],
      ["flags.midi-qol.actions", CUSTOM, "reaction=0"]
    ]
  });
  const bindingAmp = effect("curse-binding:amp", {
    name: "Binding (Amplified)",
    img: "icons/magic/control/debuff-chains-shackle-movement-red.webp",
    duration: DURATION.oneMinute.duration,
    special: ["turnEnd"],
    changes: binding.changes
  });
  docs.push(curse("binding", {
    name: "Blood Curse of Binding",
    img: "icons/magic/control/debuff-chains-shackle-movement-red.webp",
    description: `
      As a bonus action, you attempt to bind a Large or smaller creature you can see within 30 feet of you, which must
      make a Strength saving throw. On a failure, the cursed creature's speed is reduced to 0 and it can't use reactions
      until the end of your next turn.

      <strong>Amplify.</strong> This curse lasts for 1 minute and can affect any creature regardless of size. The
      cursed creature can repeat the saving throw at the end of each of its turns, ending the curse on itself on a
      success.`,
    activities: maledictActs("curse-binding", {
      normal: {
        kind: "save",
        target: targetCreature(), rng: range(30), ability: "str", onSave: "full",
        effects: [binding._id]
      },
      amplified: {
        kind: "save",
        target: targetCreature(), rng: range(30), ability: "str", onSave: "full",
        effects: [bindingAmp._id]
      }
    }),
    effects: [binding, bindingAmp]
  }));

  const bloated = effect("curse-bloated:swollen", {
    name: "Blood Curse of Bloated Agony",
    img: "icons/magic/death/skull-horned-worn-fire-blue.webp",
    ...DURATION.untilSourceTurnEnd,
    changes: [
      flagChange("disadvantage.check.str"),
      flagChange("disadvantage.check.dex")
    ]
  });
  const bloatedAmp = effect("curse-bloated:amp", {
    name: "Bloated Agony (Amplified)",
    img: "icons/magic/death/skull-horned-worn-fire-blue.webp",
    duration: DURATION.oneMinute.duration,
    special: ["turnEnd"],
    changes: bloated.changes,
    flags: {
      "midi-qol": { OverTime: `turn=end, saveAbility=con, saveDC=@hemocraft.dc, saveCount=1-, label=Bloated Agony` }
    }
  });
  docs.push(curse("bloated-agony", {
    name: "Blood Curse of Bloated Agony",
    img: "icons/magic/death/skull-horned-worn-fire-blue.webp",
    description: `
      As a bonus action, you curse a creature that you can see within 30 feet of you, causing its body to swell until
      the end of your next turn. For the duration, the creature has disadvantage on Strength checks and Dexterity checks,
      and takes 1d8 necrotic damage if it makes more than one attack during its turn.

      <strong>Amplify.</strong> This curse lasts for 1 minute. The cursed creature can make a Constitution saving throw
      at the end of each of its turns, ending the curse on itself on a success.`,
    activities: maledictActs("curse-bloated", {
      normal: { target: targetCreature(), rng: range(30), effects: [bloated._id] },
      amplified: { target: targetCreature(), rng: range(30), effects: [bloatedAmp._id] }
    }),
    effects: [bloated, bloatedAmp]
  }));

  const corrosion = effect("curse-corrosion:poisoned", {
    name: "Blood Curse of Corrosion",
    img: "icons/magic/acid/dissolve-drip-droplet-smoke-green.webp",
    duration: DURATION.oneMinute.duration,
    special: ["turnEnd"],
    statuses: ["poisoned"],
    flags: {
      "midi-qol": { OverTime: `turn=end, saveAbility=con, saveDC=@hemocraft.dc, saveCount=1-, label=Corrosion` }
    }
  });
  docs.push(curse("corrosion", {
    name: "Blood Curse of Corrosion",
    img: "icons/magic/acid/dissolve-drip-droplet-smoke-green.webp",
    requirements: "Blood Hunter 15 (Order of the Mutant)",
    description: `
      <em>Prerequisite: 15th level, Order of the Mutant</em>

      As a bonus action, you cause a creature within 30 feet of you to become poisoned. The cursed creature can make a
      Constitution saving throw at the end of each of its turns, ending the curse on itself on a success.

      <strong>Amplify.</strong> The cursed creature takes 4d6 necrotic damage when you inflict this curse, and it takes
      this damage again each time it fails a Constitution saving throw to end the curse.`,
    activities: maledictActs("curse-corrosion", {
      normal: { target: targetCreature(), rng: range(30), effects: [corrosion._id] },
      amplified: {
        kind: "damage",
        target: targetCreature(), rng: range(30), effects: [corrosion._id],
        damage: [damagePart("4d6", "necrotic")]
      }
    }),
    effects: [corrosion]
  }));

  docs.push(curse("exorcist", {
    name: "Blood Curse of the Exorcist",
    img: "icons/magic/holy/prayer-hands-glowing-yellow.webp",
    requirements: "Blood Hunter 15 (Order of the Ghostslayer)",
    description: `
      <em>Prerequisite: 15th level, Order of the Ghostslayer</em>

      As a bonus action, you choose one creature you can see within 30 feet of you that is charmed or frightened, or
      which is under a possession effect. The target creature is no longer charmed, frightened, or possessed.

      <strong>Amplify.</strong> A creature that charmed, frightened, or possessed the target of your curse takes 3d6
      psychic damage and must succeed on a Wisdom saving throw or be stunned until the end of your next turn.`,
    activities: maledictActs("curse-exorcist", {
      normal: { target: targetCreature(), rng: range(30) },
      amplified: {
        kind: "save",
        target: targetCreature(), rng: range(30), ability: "wis", onSave: "full",
        damage: [damagePart("3d6", "psychic")]
      }
    })
  }));

  const exposure = effect("curse-exposure:weak", {
    name: "Exposure",
    img: "icons/magic/unholy/beam-impact-green.webp",
    ...DURATION.untilTargetTurnEnd,
    changes: [["flags.blood-hunter.exposure", "ADD", "1"]]
  });
  docs.push(curse("exposure", {
    name: "Blood Curse of Exposure",
    img: "icons/magic/unholy/beam-impact-green.webp",
    description: `
      When a creature you can see within 30 feet of you takes damage from an attack or spell, you can use your reaction
      to temporarily weaken its resilience. Until the end of the target's next turn, it loses resistance to all the
      damage types dealt by the triggering attack or spell (including for that triggering effect).

      <strong>Amplify.</strong> The target instead loses invulnerability to the damage types of the triggering attack or
      spell, but has resistance to those damage types until the end of its next turn.

      <p><em>Automation:</em> reaction prompt is manual (bystander curse). Apply the effect, then use Midi's damage
      application with ignore resistance as appropriate.</p>`,
    activities: maledictActs("curse-exposure", {
      normal: { activation: "reaction", target: targetCreature(), rng: range(30), effects: [exposure._id] },
      amplified: { activation: "reaction", target: targetCreature(), rng: range(30), effects: [exposure._id] }
    }),
    effects: [exposure]
  }));

  docs.push(curse("eyeless", {
    name: "Blood Curse of the Eyeless",
    img: "icons/skills/wounds/injury-eyes-blood-red.webp",
    description: `
      When a creature you can see within 30 feet of you makes an attack, you can use your reaction to roll one hemocraft
      die and subtract the number rolled from the creature's attack roll. You can choose to use this feature after the
      creature's roll, but before the DM determines whether the attack hits or misses. The creature is immune to this
      curse if it is immune to the blinded condition.

      <strong>Amplify.</strong> You apply this curse to all the creature's attack rolls until the end of the creature's
      turn. You roll separately for each affected attack.

      <p><em>Automation:</em> manual reaction. Use the activity and apply the penalty to the attack roll.</p>`,
    activities: maledictActs("curse-eyeless", {
      normal: {
        activation: "reaction", target: targetCreature(), rng: range(30),
        extra: { roll: { formula: `-${HEMO_DIE}`, name: "Eyeless Penalty", prompt: true, visible: true } }
      },
      amplified: { activation: "reaction", target: targetCreature(), rng: range(30) }
    })
  }));

  docs.push(curse("fallen-puppet", {
    name: "Blood Curse of the Fallen Puppet",
    img: "icons/magic/death/skull-humanoid-worn-teal.webp",
    description: `
      When a creature you can see within 30 feet of you drops to 0 hit points, you can use your reaction to instill that
      creature with a final act of aggression. The creature immediately makes one weapon attack against a target of your
      choice within its range.

      <strong>Amplify.</strong> You can first cause the cursed creature to move up to half its speed, and you grant a
      bonus to its attack roll equal to your Hemocraft modifier (minimum of +1).

      <p><em>Automation:</em> manual reaction.</p>`,
    activities: maledictActs("curse-fallen-puppet", {
      normal: { activation: "reaction", target: targetCreature(), rng: range(30) },
      amplified: { activation: "reaction", target: targetCreature(), rng: range(30) }
    })
  }));

  const howlFright = effect("curse-howl:fright", {
    name: "Blood Curse of the Howl",
    img: "icons/creatures/mammals/wolf-howl-moon-gray.webp",
    ...DURATION.untilSourceTurnEnd,
    statuses: ["frightened"]
  });
  docs.push(curse("howl", {
    name: "Blood Curse of the Howl",
    img: "icons/creatures/mammals/wolf-howl-moon-gray.webp",
    requirements: "Blood Hunter 18 (Order of the Lycan)",
    description: `
      <em>Prerequisite: 18th level, Order of the Lycan</em>

      As an action, you unleash a bloodcurdling howl. Each creature within 30 feet of you that can hear you must succeed
      on a Wisdom saving throw or become frightened of you until the end of your next turn. If a creature fails its
      saving throw by 5 or more, it is stunned while frightened in this way. A creature that succeeds on its saving
      throw is immune to this blood curse for the next 24 hours.

      You can choose any number of creatures you can see to be unaffected by the howl.

      <strong>Amplify.</strong> The range of this curse increases to 60 feet.`,
    activities: maledictActs("curse-howl", {
      normal: {
        kind: "save", activation: "action",
        target: { template: { type: "radius", size: "30", units: "ft", count: "", contiguous: false, width: "", height: "" },
          affects: { type: "creature", count: "", choice: false, special: "" }, prompt: true },
        rng: range("self"), ability: "wis", onSave: "full", effects: [howlFright._id]
      },
      amplified: {
        kind: "save", activation: "action",
        target: { template: { type: "radius", size: "60", units: "ft", count: "", contiguous: false, width: "", height: "" },
          affects: { type: "creature", count: "", choice: false, special: "" }, prompt: true },
        rng: range("self"), ability: "wis", onSave: "full", effects: [howlFright._id]
      }
    }),
    effects: [howlFright]
  }));

  const marked = effect("curse-marked:mark", {
    name: "Blood Curse of the Marked",
    img: "icons/magic/symbols/runes-triangle-orange.webp",
    ...DURATION.untilSourceTurnEnd,
    changes: [["flags.blood-hunter.marked", "ADD", "1"]]
  });
  docs.push(curse("marked", {
    name: "Blood Curse of the Marked",
    img: "icons/magic/symbols/runes-triangle-orange.webp",
    description: `
      As a bonus action, you mark a creature that you can see within 30 feet of you. Until the end of your turn,
      whenever you hit the cursed creature with a weapon for which you have an active crimson rite, you roll an
      additional hemocraft die when determining the extra damage from the rite.

      <strong>Amplify.</strong> The next attack roll you make against the target before the end of your turn has
      advantage.`,
    activities: maledictActs("curse-marked", {
      normal: { target: targetCreature(), rng: range(30), effects: [marked._id] },
      amplified: { target: targetCreature(), rng: range(30), effects: [marked._id], midi: { toggleEffect: true } }
    }),
    effects: [marked]
  }));

  const muddled = effect("curse-muddled:next", {
    name: "Muddled Mind",
    img: "icons/magic/control/hypnosis-mesmerism-watch.webp",
    ...DURATION.untilSourceTurnEnd,
    changes: [flagChange("disadvantage.concentration")]
  });
  const muddledAmp = effect("curse-muddled:amp", {
    name: "Muddled Mind (Amplified)",
    img: "icons/magic/control/hypnosis-mesmerism-watch.webp",
    ...DURATION.untilSourceTurnEnd,
    changes: [flagChange("disadvantage.concentration")]
  });
  docs.push(curse("muddled-mind", {
    name: "Blood Curse of the Muddled Mind",
    img: "icons/magic/control/hypnosis-mesmerism-watch.webp",
    description: `
      As a bonus action, you curse a creature that you can see within 30 feet of you that is concentrating on a spell or
      using a feature that requires concentration. That creature has disadvantage on the next Constitution saving throw
      it makes to maintain concentration before the end of your next turn.

      <strong>Amplify.</strong> The cursed creature has disadvantage on all Constitution saving throws made to maintain
      concentration until the end of your next turn.`,
    activities: maledictActs("curse-muddled", {
      normal: { target: targetCreature(), rng: range(30), effects: [muddled._id] },
      amplified: { target: targetCreature(), rng: range(30), effects: [muddledAmp._id] }
    }),
    effects: [muddled, muddledAmp]
  }));

  const soulEater = effect("curse-soul-eater:buff", {
    name: "Soul Eater",
    img: "icons/magic/unholy/orb-glowing-purple.webp",
    ...DURATION.untilSourceTurnEnd,
    changes: [flagChange("advantage.attack.all"), ["flags.blood-hunter.soulEater", CUSTOM, "1"]]
  });
  docs.push(curse("soul-eater", {
    name: "Blood Curse of the Soul Eater",
    img: "icons/magic/unholy/orb-glowing-purple.webp",
    requirements: "Blood Hunter 18 (Order of the Profane Soul)",
    description: `
      <em>Prerequisite: 18th level, Order of the Profane Soul</em>

      When a creature that isn't a construct or undead is reduced to 0 hit points within 30 feet of you, you can use your
      reaction to offer their life energy to your patron in exchange for power. Until the end of your next turn, you
      make attacks with advantage and you have resistance to all damage.

      <strong>Amplify.</strong> Additionally, you regain an expended warlock spell slot. Once you've amplified this blood
      curse, you must finish a long rest before you can amplify it again.

      <p><em>Automation:</em> manual reaction. Amplified spell-slot recovery is manual.</p>`,
    activities: maledictActs("curse-soul-eater", {
      normal: { activation: "reaction", target: targetSelfEffect(), rng: range(30), effects: [soulEater._id] },
      amplified: { activation: "reaction", target: targetSelfEffect(), rng: range(30), effects: [soulEater._id] }
    }),
    effects: [soulEater]
  }));

  return [["Blood Curses", docs]];
}

function targetSelfEffect() {
  return {
    template: { count: "", contiguous: false, type: "", size: "", width: "", height: "", units: "ft" },
    affects: { count: "", type: "self", choice: false, special: "" },
    prompt: false
  };
}
