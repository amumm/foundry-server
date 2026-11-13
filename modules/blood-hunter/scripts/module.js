const MODULE_ID = "blood-hunter";
const BH_CLASS = "blood-hunter";

const ALL_DAMAGE_TYPES = [
  "acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic",
  "radiant", "slashing", "thunder"
];

/* -------------------------------------------- */
/*  Setup                                       */
/* -------------------------------------------- */

Hooks.once("init", () => {
  const subtypes = CONFIG.DND5E.featureTypes.class.subtypes;
  subtypes.bloodCurse = "Blood Curse";
  subtypes.crimsonRite = "Crimson Rite";
  subtypes.mutagen = "Mutagen";
  subtypes.orderFeature = "Blood Hunter Order Feature";

  // Must be registered before dnd5e builds its spellcasting models during i18nInit
  const pact = CONFIG.DND5E.spellcasting?.pact;
  if ( pact?.progression ) pact.progression.profaneSoul = { label: "Profane Soul", divisor: 1 };

  wrapGetRollData();
  globalThis.BloodHunter = BloodHunter;
});

Hooks.once("i18nInit", () => {
  const pact = CONFIG.DND5E.spellcasting?.pact;
  if ( typeof pact?.computeProgression !== "function" ) return;
  const original = pact.computeProgression.bind(pact);
  pact.computeProgression = (progression, actor, cls, spellcasting, count) => {
    if ( spellcasting?.progression !== "profaneSoul" ) return original(progression, actor, cls, spellcasting, count);
    const hasWarlock = (actor?.classes?.warlock?.system?.levels ?? 0) > 0;
    progression.pact = (progression.pact ?? 0) + profaneSoulPactLevel(spellcasting.levels ?? 0, hasWarlock);
  };
});

function profaneSoulPactLevel(level, hasWarlock) {
  if ( hasWarlock ) return Math.floor(level / 3);
  if ( level >= 19 ) return 7;
  if ( level >= 13 ) return 5;
  if ( level >= 7 ) return 3;
  if ( level >= 6 ) return 2;
  if ( level >= 3 ) return 1;
  return 0;
}

function wrapGetRollData() {
  function addHemocraft(data) {
    if ( !this.classes?.[BH_CLASS] ) return data;
    const ability = this.flags?.[MODULE_ID]?.hemocraftAbility === "wis" ? "wis" : "int";
    const abilityData = this.system.abilities?.[ability];
    // Prefer prepared mod; fall back to score so early prepareDerivedData (before
    // prepareAbilities) still resolves Dark Augmentation and similar formulas.
    const mod = Number.isFinite(abilityData?.mod)
      ? abilityData.mod
      : Math.floor(((abilityData?.value ?? 10) - 10) / 2);
    const prof = this.system.attributes?.prof ?? 0;
    const die = this.system.scale?.[BH_CLASS]?.["hemocraft-die"];
    data.hemocraft = {
      ability,
      mod,
      dc: 8 + prof + mod,
      die: die?.formula ?? "1d4",
      faces: die?.faces ?? 4,
      maledictBonus: Number(this.flags?.[MODULE_ID]?.maledictBonus ?? 0) || 0
    };
    return data;
  }

  const target = "CONFIG.Actor.documentClass.prototype.getRollData";
  if ( globalThis.libWrapper ) {
    libWrapper.register(MODULE_ID, target, function(wrapped, ...args) {
      return addHemocraft.call(this, wrapped(...args));
    }, "WRAPPER");
  } else {
    const proto = CONFIG.Actor.documentClass.prototype;
    const original = proto.getRollData;
    proto.getRollData = function(...args) {
      return addHemocraft.call(this, original.apply(this, args));
    };
  }
}

/* -------------------------------------------- */
/*  Helpers                                     */
/* -------------------------------------------- */

function isBH(actor) {
  return !!actor?.classes?.[BH_CLASS];
}

function bhLevel(actor) {
  return actor?.classes?.[BH_CLASS]?.system?.levels ?? 0;
}

function hasFeature(actor, identifier) {
  return actor?.items?.some(i => i.system?.identifier === identifier) ?? false;
}

function bhFlag(actor, key) {
  return actor?.flags?.[MODULE_ID]?.[key];
}

function riteOn(item) {
  return item?.effects?.find(e => e.flags?.[MODULE_ID]?.rite && !e.disabled) ?? null;
}

function hasActiveRite(actor) {
  return actor?.items?.some(i => i.type === "weapon" && riteOn(i)) ?? false;
}

function hemocraft(actor) {
  return actor.getRollData().hemocraft ?? { mod: 0, die: "1d4", faces: 4 };
}

function firstToken(set) {
  if ( !set ) return null;
  for ( const t of set ) return t;
  return null;
}

function tokenFor(actor) {
  return actor?.getActiveTokens?.()?.[0] ?? null;
}

function distanceBetween(a, b) {
  if ( !a || !b ) return Infinity;
  if ( globalThis.MidiQOL?.computeDistance ) return MidiQOL.computeDistance(a, b);
  return canvas.grid.measurePath([a.center, b.center]).distance;
}

async function confirm(title, content) {
  const DialogV2 = foundry.applications?.api?.DialogV2;
  if ( DialogV2 ) return DialogV2.confirm({ window: { title }, content, rejectClose: false });
  return Dialog.confirm({ title, content });
}

async function gmCreateEffects(actor, effects) {
  if ( actor.isOwner ) return actor.createEmbeddedDocuments("ActiveEffect", effects);
  return MidiQOL?.socket?.().executeAsGM("createEffects", { actorUuid: actor.uuid, effects, options: {} });
}

async function gmDeleteEffects(uuids) {
  if ( !uuids.length ) return;
  const owned = [];
  const remote = [];
  for ( const uuid of uuids ) {
    const effect = fromUuidSync(uuid);
    if ( effect?.isOwner ) owned.push(effect);
    else remote.push(uuid);
  }
  for ( const effect of owned ) await effect.delete();
  if ( remote.length ) await MidiQOL?.socket?.().executeAsGM("deleteEffectsByUuid", { effectsToDelete: remote, options: {} });
}

async function healActor(actor, amount, flavor) {
  if ( amount <= 0 ) return;
  await actor.applyDamage(-amount);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><strong>${flavor}:</strong> ${actor.name} regains ${amount} hit points.</p>`
  });
}

/* -------------------------------------------- */
/*  Crimson rites                               */
/* -------------------------------------------- */

Hooks.on("createActiveEffect", async (effect, options, userId) => {
  if ( userId !== game.user.id ) return;
  const rite = effect.flags?.[MODULE_ID]?.rite;
  const weapon = effect.parent;
  if ( !rite || !(weapon instanceof Item) ) return;

  const others = weapon.effects.filter(e => (e.id !== effect.id) && e.flags?.[MODULE_ID]?.rite);
  if ( others.length ) await weapon.deleteEmbeddedDocuments("ActiveEffect", others.map(e => e.id));

  if ( rite === "dawn" && weapon.actor ) await startDawn(weapon.actor, effect);
});

Hooks.on("deleteActiveEffect", async (effect, options, userId) => {
  if ( userId !== game.user.id ) return;
  if ( effect.flags?.[MODULE_ID]?.rite === "dawn" && effect.parent?.actor ) await endDawn(effect.parent.actor, effect);
});

async function startDawn(actor, riteEffect) {
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: "Rite of the Dawn",
    img: riteEffect.img,
    origin: riteEffect.uuid,
    changes: [{ key: "system.traits.dr.value", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: "necrotic" }],
    flags: { [MODULE_ID]: { dawnAura: riteEffect.uuid } }
  }]);
  for ( const token of actor.getActiveTokens(false, true) ) {
    if ( !token.isOwner ) continue;
    await token.setFlag(MODULE_ID, "lightBeforeDawn", token.light.toObject());
    await token.update({ light: { bright: 20, dim: 40 } });
  }
}

async function endDawn(actor, riteEffect) {
  const auras = actor.effects.filter(e => e.flags?.[MODULE_ID]?.dawnAura === riteEffect.uuid);
  if ( auras.length ) await actor.deleteEmbeddedDocuments("ActiveEffect", auras.map(e => e.id));
  for ( const token of actor.getActiveTokens(false, true) ) {
    const previous = token.getFlag(MODULE_ID, "lightBeforeDawn");
    if ( !previous || !token.isOwner ) continue;
    await token.update({ light: previous });
    await token.unsetFlag(MODULE_ID, "lightBeforeDawn");
  }
}

async function clearRites(actor) {
  for ( const item of actor.items ) {
    if ( item.type !== "weapon" ) continue;
    const rites = item.effects.filter(e => e.flags?.[MODULE_ID]?.rite);
    if ( rites.length ) await item.deleteEmbeddedDocuments("ActiveEffect", rites.map(e => e.id));
  }
}

Hooks.on("dnd5e.restCompleted", async (actor) => {
  if ( isBH(actor) && actor.isOwner ) await clearRites(actor);
});

/* -------------------------------------------- */
/*  Rite Revival                                */
/* -------------------------------------------- */

Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
  if ( userId !== game.user.id ) return;
  const newHp = foundry.utils.getProperty(changes, "system.attributes.hp.value");
  if ( (newHp === undefined) || (newHp > 0) ) return;
  if ( (actor.system.attributes.hp.value <= 0) || !hasFeature(actor, "gs-rite-revival") || !hasActiveRite(actor) ) return;
  foundry.utils.setProperty(changes, "system.attributes.hp.value", 1);
  options.bloodHunterRiteRevival = true;
});

Hooks.on("updateActor", async (actor, changes, options, userId) => {
  if ( (userId !== game.user.id) || !options.bloodHunterRiteRevival ) return;
  await clearRites(actor);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<p><strong>Rite Revival:</strong> ${actor.name}'s crimson rites end and they drop to 1 hit point instead.</p>`
  });
});

/* -------------------------------------------- */
/*  Blood Curse of Exposure                     */
/* -------------------------------------------- */

Hooks.on("dnd5e.preCalculateDamage", (actor, damages, options) => {
  if ( !bhFlag(actor, "exposure") || (options.ignore === true) ) return;
  options.ignore = { ...(options.ignore ?? {}), resistance: true };
});

/* -------------------------------------------- */
/*  Great Weapon Fighting                       */
/* -------------------------------------------- */

Hooks.on("dnd5e.preRollDamageV2", (config) => {
  const activity = config.subject;
  const item = activity?.item;
  if ( !bhFlag(activity?.actor, "greatWeaponFighting") || (item?.type !== "weapon") ) return;
  if ( activity.actionType !== "mwak" ) return;
  const mode = config.attackMode ?? config.rolls?.[0]?.options?.attackMode ?? "";
  const twoHanded = (mode === "twoHanded") || (!mode && item.system.properties?.has("two"));
  if ( !twoHanded ) return;
  for ( const roll of config.rolls ?? [] ) {
    roll.parts = (roll.parts ?? []).map(p => String(p).replace(/\b(\d+)d(\d+)\b(?!r)/g, "$1d$2r<3"));
  }
});

/* -------------------------------------------- */
/*  Turn start: Lycan regeneration, Bloodlust,   */
/*  Reconstruction mutagen                      */
/* -------------------------------------------- */

Hooks.on("combatTurnChange", async (combat, prior, current) => {
  if ( !game.user.isActiveGM ) return;
  const actor = combat.combatants.get(current.combatantId)?.actor;
  if ( !isBH(actor) ) return;

  const hp = actor.system.attributes.hp;
  const belowHalf = () => (actor.system.attributes.hp.value >= 1) && (actor.system.attributes.hp.value < hp.max / 2);
  const hybrid = !!bhFlag(actor, "lycanHybrid");

  if ( hybrid && bhFlag(actor, "lycanRegen") && belowHalf() ) {
    await healActor(actor, Math.max(1, 1 + (actor.system.abilities.con?.mod ?? 0)), "Lycan Regeneration");
  }
  if ( bhFlag(actor, "mutagenReconstruction") && belowHalf() ) {
    await healActor(actor, actor.system.attributes.prof ?? 2, "Reconstruction Mutagen");
  }

  if ( hybrid && (actor.system.attributes.hp.value < hp.max / 2) ) await rollBloodlust(actor);
});

async function rollBloodlust(actor) {
  const concentrating = actor.statuses?.has("concentrating");
  let failed = concentrating;
  if ( !concentrating ) {
    const advantage = !!bhFlag(actor, "brandVoracious");
    const rolls = await actor.rollSavingThrow({ ability: "wis", target: 8, advantage }, { configure: false });
    failed = (rolls?.[0]?.total ?? 0) < 8;
  }
  const reason = concentrating ? " (automatically fails while concentrating)" : "";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: failed
      ? `<p><strong>Bloodlust${reason}:</strong> ${actor.name} must move toward the nearest creature and use the Attack action against it.</p>`
      : `<p><strong>Bloodlust:</strong> ${actor.name} keeps control.</p>`
  });
}

/* -------------------------------------------- */
/*  Midi-QOL workflow handling                  */
/* -------------------------------------------- */

Hooks.on("midi-qol.RollComplete", async (workflow) => {
  try {
    await handleBrandRetaliation(workflow);
    if ( isBH(workflow.actor) ) await handleBloodHunterAttack(workflow);
  } catch(err) {
    console.error(`${MODULE_ID} | RollComplete handler failed`, err);
  }
});

async function handleBloodHunterAttack(workflow) {
  const actor = workflow.actor;
  const rite = riteOn(workflow.item);
  const target = firstToken(workflow.hitTargets);
  if ( !rite || !target ) return;

  if ( workflow.isCritical && hasFeature(actor, "sanguine-mastery") ) {
    const maledict = actor.items.find(i => i.system.identifier === "blood-maledict");
    if ( maledict?.system.uses?.spent > 0 ) {
      await maledict.update({ "system.uses.spent": maledict.system.uses.spent - 1 });
      ui.notifications.info(`${actor.name} regains a use of Blood Maledict (Sanguine Mastery).`);
    }
  }

  const brand = actor.items.find(i => i.system.identifier === "brand-of-castigation");
  const brandAvailable = brand && (brand.system.uses?.value ?? 0) > 0;
  const alreadyBranded = target.actor?.effects.some(e => (e.flags?.[MODULE_ID]?.type === "brand")
    && (e.flags?.[MODULE_ID]?.brandedBy === actor.uuid));
  if ( brandAvailable && !alreadyBranded && (workflow.damageTotal ?? 0) > 0 ) {
    const ok = await confirm("Brand of Castigation", `<p>Brand <strong>${target.name}</strong>?</p>`);
    if ( ok ) {
      await brand.update({ "system.uses.spent": brand.system.uses.spent + 1 });
      await BloodHunter.applyBrand(actor, target);
    }
  }
}

async function handleBrandRetaliation(workflow) {
  const attacker = workflow.actor;
  if ( !attacker || !((workflow.damageTotal ?? 0) > 0) || !workflow.hitTargets?.size ) return;
  const brands = attacker.effects.filter(e => e.flags?.[MODULE_ID]?.type === "brand" && e.flags?.[MODULE_ID]?.brandedBy);
  if ( !brands.length ) return;
  const attackerToken = workflow.token ?? tokenFor(attacker);

  for ( const brand of brands ) {
    const hunter = fromUuidSync(brand.flags[MODULE_ID].brandedBy);
    const hunterToken = tokenFor(hunter);
    if ( !hunter || !hunterToken ) continue;
    const triggered = [...workflow.hitTargets].some(t => (t.actor === hunter) || (distanceBetween(t, hunterToken) <= 5));
    if ( !triggered ) continue;

    const mult = Number(hunter.system.scale?.[BH_CLASS]?.["brand-mult"]?.value ?? 1) || 1;
    const amount = Math.max(1, hemocraft(hunter).mod) * mult;
    const roll = await new Roll(`${amount}[psychic]`).evaluate();
    new MidiQOL.DamageOnlyWorkflow(hunter, hunterToken, amount, "psychic", [attackerToken], roll, {
      flavor: "Brand of Castigation", itemCardId: "new"
    });
  }
}

/* -------------------------------------------- */
/*  Public API                                  */
/* -------------------------------------------- */

const BloodHunter = {
  clearRites,

  async applyBrand(hunter, targetToken) {
    const targetActor = targetToken.actor;
    const brandItem = hunter.items.find(i => i.system.identifier === "brand-of-castigation");
    const source = brandItem?.effects.find(e => e.flags?.[MODULE_ID]?.type === "brand");
    if ( !targetActor || !source ) return;

    const previous = [];
    for ( const token of canvas.tokens.placeables ) {
      for ( const effect of token.actor?.effects ?? [] ) {
        if ( (effect.flags?.[MODULE_ID]?.type === "brand") && (effect.flags?.[MODULE_ID]?.brandedBy === hunter.uuid) ) {
          previous.push(effect.uuid);
        }
      }
    }
    await gmDeleteEffects(previous);

    const data = source.toObject();
    delete data._id;
    data.transfer = false;
    data.origin = brandItem.uuid;
    data.changes = data.changes.map(c => ({ ...c, value: String(c.value).replace("@actorUuid", hunter.uuid) }));
    foundry.utils.setProperty(data, `flags.${MODULE_ID}.brandedBy`, hunter.uuid);
    await gmCreateEffects(targetActor, [data]);
  },

  /** Midi-QOL DamageBonusMacro entry point. */
  async damageBonus({ actor, item, workflow }) {
    if ( !isBH(actor) || !workflow ) return [];
    const bonuses = [];
    const targetActor = firstToken(workflow.hitTargets)?.actor;
    const { die } = hemocraft(actor);
    const rite = riteOn(item);

    if ( rite ) {
      const type = rite.flags[MODULE_ID].damageType;
      const add = flavor => bonuses.push({ damageRoll: die, damageType: type, flavor });
      if ( (rite.flags[MODULE_ID].rite === "dawn") && (targetActor?.system.details?.type?.value === "undead") ) {
        add("Rite of the Dawn (undead)");
      }
      if ( bhFlag(actor, "sundering") ) add("Brand of Sundering");
      const marked = targetActor?.effects.some(e => e.origin?.startsWith(actor.uuid)
        && e.changes.some(c => c.key === `flags.${MODULE_ID}.marked`));
      if ( marked ) add("Blood Curse of the Marked");
    }

    if ( targetActor && hasFeature(actor, "patron-hexblade") ) {
      const curse = targetActor.effects.find(e => e.origin?.startsWith(actor.uuid)
        && fromUuidSync(e.origin)?.system?.identifier?.startsWith("curse-")
        && !e.flags?.[MODULE_ID]?.hexUsed);
      if ( curse ) {
        bonuses.push({ damageRoll: String(actor.system.attributes.prof ?? 2), flavor: "Hexblade (cursed target)" });
        await MidiQOL?.socket?.().executeAsGM("updateEffects", {
          actorUuid: targetActor.uuid, updates: [{ _id: curse.id, [`flags.${MODULE_ID}.hexUsed`]: true }]
        });
      }
    }

    const mode = workflow.attackMode ?? workflow.attackRoll?.options?.attackMode ?? "";
    if ( (item?.type === "weapon") && bhFlag(actor, "dueling") && (workflow.activity?.actionType === "mwak")
      && (mode !== "twoHanded") ) {
      const otherWeapons = actor.items.filter(i => (i.type === "weapon") && (i.id !== item.id) && i.system.equipped
        && (i.system.type?.value !== "natural"));
      if ( !otherWeapons.length ) bonuses.push({ damageRoll: "2", flavor: "Dueling" });
    }

    if ( (item?.type === "weapon") && bhFlag(actor, "twoWeaponFighting") && mode.endsWith("offhand") ) {
      const ability = item.system.abilityMod ?? "str";
      const mod = actor.system.abilities?.[ability]?.mod ?? 0;
      if ( mod > 0 ) bonuses.push({ damageRoll: String(mod), flavor: "Two-Weapon Fighting" });
    }

    return bonuses;
  }
};
