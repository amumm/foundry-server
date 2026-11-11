import fs from "node:fs";
import path from "node:path";
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { MODULE_ID, makeId, missingIcons } from "./lib/helpers.mjs";
import classDocs from "./content/class.mjs";
import featureDocs from "./content/features.mjs";
import curseDocs from "./content/curses.mjs";
import riteDocs from "./content/rites.mjs";
import mutagenDocs from "./content/mutagens.mjs";
import optionDocs from "./content/options.mjs";
import orderDocs from "./content/orders.mjs";

const ROOT = import.meta.dirname;
const BUILD_DIR = path.join(ROOT, ".build");
const PACK_DIR = path.resolve(ROOT, "../../modules", MODULE_ID, "packs");

/** Pack name -> list of [folderName | null, docs[]] */
const PACKS = {
  "bh-class": [...classDocs(), ...orderDocs()],
  "bh-features": featureDocs(),
  "bh-curses": curseDocs(),
  "bh-rites": riteDocs(),
  "bh-mutagens": mutagenDocs(),
  "bh-options": optionDocs()
};

/* -------------------------------------------- */
/*  Resolve cross references                    */
/* -------------------------------------------- */

const registry = new Map();
for ( const [pack, groups] of Object.entries(PACKS) ) {
  for ( const [, docs] of groups ) {
    for ( const doc of docs ) {
      const slug = doc._slug ?? doc.system.identifier;
      if ( registry.has(slug) ) throw new Error(`Duplicate slug "${slug}"`);
      registry.set(slug, `Compendium.${MODULE_ID}.${pack}.Item.${doc._id}`);
    }
  }
}

function resolveRefs(json) {
  return json.replace(/@@REF:([\w-]+)@@/g, (_, slug) => {
    const uuid = registry.get(slug);
    if ( !uuid ) throw new Error(`Unresolved reference "${slug}"`);
    return uuid;
  });
}

/* -------------------------------------------- */
/*  Write sources and compile                   */
/* -------------------------------------------- */

fs.rmSync(BUILD_DIR, { recursive: true, force: true });
let total = 0;

for ( const [pack, groups] of Object.entries(PACKS) ) {
  const src = path.join(BUILD_DIR, pack);
  fs.mkdirSync(src, { recursive: true });

  groups.forEach(([folderName, docs], folderIndex) => {
    let folderId = null;
    if ( folderName ) {
      folderId = makeId(`folder:${pack}:${folderName}`);
      const folder = {
        _id: folderId, name: folderName, type: "Item", folder: null, sorting: "a",
        sort: (folderIndex + 1) * 100000, color: null, flags: {}, description: "",
        _key: `!folders!${folderId}`
      };
      fs.writeFileSync(path.join(src, `_folder-${folderId}.json`), JSON.stringify(folder, null, 2));
    }

    docs.forEach((doc, i) => {
      delete doc._slug;
      doc.folder = folderId;
      doc.sort = (i + 1) * 100000;
      doc._key = `!items!${doc._id}`;
      for ( const effect of doc.effects ?? [] ) effect._key = `!items.effects!${doc._id}.${effect._id}`;
      const json = resolveRefs(JSON.stringify(doc, null, 2));
      fs.writeFileSync(path.join(src, `${doc._id}.json`), json);
      total++;
    });
  });

  const dest = path.join(PACK_DIR, pack);
  fs.rmSync(dest, { recursive: true, force: true });
  await compilePack(src, dest, { log: false });
  console.log(`Compiled ${pack}`);
}

if ( missingIcons.size ) {
  console.warn(`Missing icons replaced with fallback:\n  ${[...missingIcons].join("\n  ")}`);
}
console.log(`Built ${total} documents.`);
