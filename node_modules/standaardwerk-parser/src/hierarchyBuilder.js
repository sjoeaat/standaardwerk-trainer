// src/core/hierarchyBuilder.js

/**
 * Bouwt een hiërarchische mappenstructuur
 * uit een flat array van programma-objecten met elk een folderPath: string[].
 */
export function buildFolderTree(programs) {
  // root node heeft zelf geen naam, maar wél een lege programs-lijst en children-map
  const root = { name: null, children: {}, programs: [] };

  for (const prog of programs) {
    let node = root;
    // voor elk segment in de folderPath, duik dieper in de boom
    for (const segment of prog.folderPath || []) {
      if (!node.children[segment]) {
        node.children[segment] = {
          name: segment,
          children: {},
          programs: [],
        };
      }
      node = node.children[segment];
    }
    // als alle segmenten zijn doorlopen, stop het programma in deze map
    node.programs.push(prog);
  }

  return root;
}
