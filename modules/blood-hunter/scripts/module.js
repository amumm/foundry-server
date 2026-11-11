const MODULE_ID = "blood-hunter";

const BH_CLASS = "blood-hunter";

Hooks.once("init", () => {
  CONFIG.DND5E.featureTypes.class.subtypes.bloodCurse = "Blood Curse";
  CONFIG.DND5E.featureTypes.class.subtypes.crimsonRite = "Crimson Rite";
  CONFIG.DND5E.featureTypes.class.subtypes.mutagen = "Mutagen";
  CONFIG.DND5E.featureTypes.class.subtypes.orderFeature = "Order Feature";

  wrapGetRollData();
  globalThis.BloodHunter = BloodHunter;
});

Hooks.once("ready", () => {
  configureProfaneSoulPact();
  if ( !game.modules.get("midi-qol")?.active ) {
    ui.notifications?.warn("Blood Hunter: Midi-QOL is recommended for full automation.");
  }
});

/** @returns {boolean} */
function isBH(actor) {
  return actor?.classes?.[BH_CLASS] !== undefined;
}

function hemocraftAbility(actor) {
  return actor.getFlag(MODULE_ID, "hemocraftAbility")
    ?? actor.getFlag(MODULE_ID, "hemocraftAbility".replace("blood-hunter", MODULE_ID))
    ?? actor.flags?.[MODULE_ID]?.hemocraftAbility
    ?? "int";
}

function getBHLevel(actor) {
  return actor.classes?.[BH_CLASS]?.system?.levels ?? 0;
}

function wrapGetRollData() {
  const target = "CONFIG.Actor.documentClass.prototype.getRollData";
  const wrap = (wrapped, ...args) => {
    const data = wrapped(...args);
    if ( !this.classes?.[BH_CLASS] ) return data;
    const ability = hemocraftAbility(this);
    const mod = this.system.abilities?.[ability]?.mod ?? 0;
    const prof = this.system.attributes?.prof ?? 0;
    const die = this.getFlag(MODULE_ID, "hemocraftDie")
      ?? this.system.scale?.[BH_CLASS]?.["hemocraft-die"]?.formula
      ?? "1d4";
    data.hemocraft = {
      mod,
      dc: 8 + prof + mod,
      die,
      maledictBonus: Number(this.flags?.[MODULE_ID]?.maledictBonus ?? 0)
    };
    return data;
  };

  if ( game.modules.get("lib-wrapper")?.active ) {
    libWrapper.register(MODULE_ID, target, wrap, "WRAPPER");
  } else {
    const ActorClass = CONFIG.Actor.documentClass;
    const original = ActorClass.prototype.getRollData;
    ActorClass.prototype.getRollData = function (...args) {
      return wrap.call(this, original.bind(this), ...args);
    };
  }
}

function profaneSoulWarlockLevel(bhLevel, hasWarlock) {
  let equiv = 0;
  if ( bhLevel <= 2 ) equiv = 0;
  else if ( bhLevel <= 5 ) equiv = 1;
  else if ( bhLevel === 6 ) equiv = 2;
  else if ( bhLevel <= 12 ) equiv = 3;
  else if ( bhLevel <= 18 ) equiv = 5;
  else equiv = 7;
  if ( hasWarlock ) equiv += Math.floor(bhLevel / 3);
  return equiv;
}

function configureProfaneSoulPact() {
  const pact = CONFIG.DND5E?.spellcasting?.pact;
  if ( !pact ) return;
  pact.progression.profaneSoul = { label: "Profane Soul", divisor: 1 };
  CONFIG.DND5E.spellProgression.profaneSoul = { label: "Profane Soul", divisor: 1, type: "pact" };
  const original = pact.computeProgression.bind(pact);
  pact.computeProgression = (progression, actor, cls, spellcasting, count) => {
    if ( spellcasting?.progression !== "profaneSoul" ) return original(progression, actor, cls, spellcasting, count);
    const bhLevel = getBHLevel(actor);
    const hasWarlock = (actor.classes?.warlock?.system?.levels ?? 0) > 0;
    progression.pact += profaneSoulWarlockLevel(bhLevel, hasWarlock);
  };
}

Hooks.on("dnd5e.restCompleted", async (actor, result, config) => {
  if ( !isBH(actor) ) return;
  await BloodHunter.clearRiteEnchantments(actor);
});

Hooks.on("createActiveEffect", async (effect, options, userId) => {
  if ( !effect.flags?.dnd5e?.enchantment && !effect.flags?.[MODULE_ID]?.rite ) return;
  const parent = effect.parent;
  if ( !(parent instanceof Item) || parent.type !== "weapon" ) return;
  const actor = parent.actor;
  if ( !actor || !isBH(actor) ) return;
  for ( const other of parent.effects.filter(e => e.id !== effect.id && (e.flags?.[MODULE_ID]?.rite || e.flags?.dnd5e?.enchantment)) ) {
    await other.delete();
  }
});

Hooks.on("preUpdateActor", async (actor, update, options, userId) => {
  if ( !isBH(actor) ) return;
  const hp = update.system?.attributes?.hp?.value;
  if ( hp === undefined || hp > 0 ) return;
  const current = actor.system.attributes.hp.value;
  if ( current <= 0 ) return;
  if ( !actor.items.some(i => i.flags?.[MODULE_ID]?.riteActive) ) return;
  const hasRevival = actor.items.some(i => i.system.identifier === "gs-rite-revival");
  if ( !hasRevival ) return;
  if ( await Dialog.confirm({
    title: "Rite Revival",
    content: "<p>End all active crimson rites and drop to 1 hit point instead?</p>"
  }) ) {
    update.system.attributes.hp.value = 1;
    options.riteRevival = true;
  }
});

Hooks.on("updateActor", async (actor, update, options, userId) => {
  if ( options.riteRevival ) await BloodHunter.clearRiteEnchantments(actor);
});

Hooks.on("combatTurnChange", async (combat, prior, current) => {
  if ( !game.user.isActiveGM ) return;
  const combatant = combat.combatants.get(current.combatantId);
  const actor = combatant?.actor;
  if ( !actor || !isBH(actor) ) return;
  await BloodHunter.onTurnStart(actor, combat, current);
});

Hooks.on("midi-qol.RollComplete", async (workflow) => {
  const actor = workflow.actor;
  if ( !isBH(actor) ) return;
  await BloodHunter.onRollComplete(workflow);
});

const BloodHunter = {
  async clearRiteEnchantments(actor) {
    const updates = [];
    for ( const item of actor.items ) {
      if ( item.type !== "weapon" ) continue;
      for ( const effect of item.effects ) {
        if ( effect.flags?.[MODULE_ID]?.rite || effect.origin?.includes(MODULE_ID) ) {
          await effect.delete();
        }
      }
    }
    for ( const item of actor.items ) {
      if ( item.getFlag(MODULE_ID, "riteActive") ) await item.unsetFlag(MODULE_ID, "riteActive");
    }
  },

  async onTurnStart(actor, combat, current) {
    const hybrid = actor.effects.find(e => e.flags?.[MODULE_ID]?.lycanHybrid || e.name === "Hybrid Transformation");
    const hp = actor.system.attributes.hp;
    const half = Math.floor(hp.max / 2);

    if ( hybrid && actor.getFlag(MODULE_ID, "lycanRegen") && hp.value >= 1 && hp.value < half ) {
      const heal = 1 + (actor.system.abilities.con?.mod ?? 0);
      await actor.applyDamage(-Math.max(1, heal), { healing: true });
    }

    if ( actor.getFlag(MODULE_ID, "mutagenReconstruction") && hp.value >= 1 && hp.value < half ) {
      await actor.applyDamage(-(actor.system.attributes.prof ?? 2), { healing: true });
    }

    if ( hybrid && hp.value < half ) {
      const adv = getBHLevel(actor) >= 15 && actor.getFlag(MODULE_ID, "brandVoracious");
      const dc = adv ? { advantage: true } : {};
      const save = await actor.rollAbilitySave("wis", dc);
      const total = save?.total ?? 10;
      const fail = total < 8;
      const concentrating = actor.effects.some(e => e.statuses?.has?.("concentrating"));
      if ( fail || (concentrating && total < 8) ) {
        ui.notifications.info(`${actor.name} must move toward the nearest creature and attack (Bloodlust).`);
      }
    }
  },

  async onRollComplete(workflow) {
    const actor = workflow.actor;
    if ( !actor || workflow.hitTargets?.size === 0 ) return;
    const item = workflow.item;
    const hasRite = workflow.damageRolls?.some(r => r.options?.properties?.has?.("mgc"))
      || item?.effects?.some(e => e.flags?.[MODULE_ID]?.rite);

    if ( workflow.isCritical && hasRite && getBHLevel(actor) >= 20 ) {
      const maledict = actor.items.find(i => i.system.identifier === "blood-maledict");
      if ( maledict?.system.uses.spent > 0 ) await maledict.update({ "system.uses.spent": maledict.system.uses.spent - 1 });
    }

    if ( hasRite && workflow.damageTotal > 0 ) {
      const brand = actor.items.find(i => i.system.identifier === "brand-of-castigation");
      if ( brand?.system.uses.spent < (brand.system.uses.max || 1) ) {
        const target = workflow.hitTargets.first();
        if ( target && await Dialog.confirm({
          title: "Brand of Castigation",
          content: `<p>Brand ${target.name}?</p>`
        }) ) {
          await brand.update({ "system.uses.spent": brand.system.uses.spent + 1 });
          await BloodHunter.applyBrand(actor, target);
        }
      }
    }
  },

  async applyBrand(sourceActor, targetToken) {
    const targetActor = targetToken.actor;
    if ( !targetActor ) return;
    const brandItem = sourceActor.items.find(i => i.system.identifier === "brand-of-castigation");
    const effectData = brandItem?.effects?.find(e => e.name === "Branded")?.toObject();
    if ( !effectData ) return;
    effectData.origin = sourceActor.uuid;
    effectData.flags = { ...effectData.flags, [MODULE_ID]: { brandedBy: sourceActor.uuid } };
    await targetActor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    for ( const other of targetActor.effects.filter(e => e.flags?.[MODULE_ID]?.type === "brand" && e.id !== effectData._id) ) {
      await other.delete();
    }
  },

  damageBonus({ actor }) {
    if ( !isBH(actor) ) return [];
    const bonuses = [];
    const die = actor.getRollData().hemocraft?.die ?? "1d4";

    if ( actor.getFlag(MODULE_ID, "dawnUndead") || actor.effects.some(e => e.flags?.[MODULE_ID]?.dawn) ) {
      bonuses.push({ damageRoll: die, flavor: "Rite of the Dawn (undead)" });
    }
    if ( actor.getFlag(MODULE_ID, "sundering") ) {
      bonuses.push({ damageRoll: die, flavor: "Brand of Sundering" });
    }
    return bonuses;
  }
};

Hooks.on("dnd5e.rollDamage", (rolls, data) => {
  const actor = data?.subject?.actor;
  if ( !actor?.getFlag?.(MODULE_ID, "greatWeaponFighting") ) return;
  const mode = rolls[0]?.options?.attackMode ?? "";
  if ( mode.endsWith("offhand") && !actor.getFlag(MODULE_ID, "twoWeaponFighting") ) return;
  for ( const roll of rolls ) {
    if ( !roll.dice?.length ) continue;
    for ( const term of roll.terms ?? [] ) {
      if ( term.faces && (term.number === 1 || term.number === 2) && term.className === "Die" ) {
        // Great Weapon Fighting reroll is surfaced via optional rule; prompt in chat only.
      }
    }
  }
});
