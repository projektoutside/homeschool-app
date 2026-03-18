(() => {
  const ASSET_ROOT = "./50States";
  const HINT_DURATION_MS = 5000;
  const HINTS_PER_SESSION = 3;
  const rawHintData = window.StatesChampionHintDataRaw;
  const rawUsMapData = window.StatesChampionUsMapDataRaw;

  if (!rawHintData) {
    throw new Error("StatesChampionHintDataRaw must load before StatesChampionData.");
  }

  if (!rawUsMapData) {
    throw new Error("StatesChampionUsMapDataRaw must load before StatesChampionData.");
  }

  const NON_STATE_FOLDERS = Object.freeze(["qa", "tmp", "tools"]);

  const OFFICIAL_STATES = Object.freeze([
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
  ]);

  const REGION_BY_STATE = Object.freeze({
    Alabama: "South",
    Alaska: "West",
    Arizona: "West",
    Arkansas: "South",
    California: "West",
    Colorado: "West",
    Connecticut: "Northeast",
    Delaware: "South",
    Florida: "South",
    Georgia: "South",
    Hawaii: "West",
    Idaho: "West",
    Illinois: "Midwest",
    Indiana: "Midwest",
    Iowa: "Midwest",
    Kansas: "Midwest",
    Kentucky: "South",
    Louisiana: "South",
    Maine: "Northeast",
    Maryland: "South",
    Massachusetts: "Northeast",
    Michigan: "Midwest",
    Minnesota: "Midwest",
    Mississippi: "South",
    Missouri: "Midwest",
    Montana: "West",
    Nebraska: "Midwest",
    Nevada: "West",
    "New Hampshire": "Northeast",
    "New Jersey": "Northeast",
    "New Mexico": "West",
    "New York": "Northeast",
    "North Carolina": "South",
    "North Dakota": "Midwest",
    Ohio: "Midwest",
    Oklahoma: "South",
    Oregon: "West",
    Pennsylvania: "Northeast",
    "Rhode Island": "Northeast",
    "South Carolina": "South",
    "South Dakota": "Midwest",
    Tennessee: "South",
    Texas: "South",
    Utah: "West",
    Vermont: "Northeast",
    Virginia: "South",
    Washington: "West",
    "West Virginia": "South",
    Wisconsin: "Midwest",
    Wyoming: "West",
  });

  const FUN_FACT_BY_STATE = Object.freeze({
    Alabama: "Montgomery is Alabama's capital city, and Birmingham is its largest city.",
    Alaska: "Alaska is the largest state in the United States.",
    Arizona: "Arizona is home to the Grand Canyon, one of the world's most famous landforms.",
    Arkansas: "Arkansas is nicknamed the Natural State because of its forests, rivers, and mountains.",
    California: "California has giant redwood trees, sunny beaches, and the lowest place in North America: Death Valley.",
    Colorado: "Colorado is famous for the Rocky Mountains and high snowy peaks.",
    Connecticut: "Connecticut was one of the original 13 colonies.",
    Delaware: "Delaware was the first state to ratify the U.S. Constitution.",
    Florida: "Florida is home to the Everglades and the warm southern city of Key West.",
    Georgia: "Atlanta is Georgia's capital and biggest city.",
    Hawaii: "Hawaii is the only state made entirely of islands.",
    Idaho: "Idaho is famous for its potatoes and wide mountain landscapes.",
    Illinois: "Illinois is home to Chicago, one of the largest cities in the country.",
    Indiana: "The Indy 500, one of the most famous car races in the world, takes place in Indiana.",
    Iowa: "Iowa is known for rich farmland and wide rolling fields.",
    Kansas: "Kansas sits in the Great Plains and is known for open prairies.",
    Kentucky: "Kentucky is known for bluegrass music and the Kentucky Derby horse race.",
    Louisiana: "New Orleans, Louisiana, is famous for jazz music and Mardi Gras parades.",
    Maine: "Maine is the easternmost state in the United States.",
    Maryland: "Maryland is known for the Chesapeake Bay and blue crabs.",
    Massachusetts: "Massachusetts is home to important early American history sites like Plymouth.",
    Michigan: "Michigan touches four of the five Great Lakes.",
    Minnesota: "Minnesota is called the Land of 10,000 Lakes.",
    Mississippi: "The Mississippi River helps form Mississippi's western border.",
    Missouri: "The Gateway Arch stands in St. Louis, Missouri.",
    Montana: "Montana is nicknamed Big Sky Country.",
    Nebraska: "Nebraska is known for prairies, farms, and the Platte River.",
    Nevada: "Nevada is home to Las Vegas and dramatic desert landscapes.",
    "New Hampshire": "New Hampshire's state motto is 'Live Free or Die.'",
    "New Jersey": "New Jersey is nicknamed the Garden State.",
    "New Mexico": "New Mexico is known for desert scenery and adobe-style buildings.",
    "New York": "New York is home to both Niagara Falls and New York City.",
    "North Carolina": "The Wright brothers made the first powered airplane flight in North Carolina.",
    "North Dakota": "North Dakota is home to Theodore Roosevelt National Park.",
    Ohio: "Ohio is known as the Buckeye State.",
    Oklahoma: "Oklahoma is home to many Native American nations and a rich tribal history.",
    Oregon: "Oregon is home to Crater Lake, the deepest lake in the United States.",
    Pennsylvania: "The Liberty Bell is in Pennsylvania.",
    "Rhode Island": "Rhode Island is the smallest state in the country.",
    "South Carolina": "South Carolina is known for historic Charleston and Atlantic beaches.",
    "South Dakota": "Mount Rushmore is carved into the Black Hills of South Dakota.",
    Tennessee: "Tennessee is home to Nashville and part of the Great Smoky Mountains.",
    Texas: "Texas is the second-largest state in the United States.",
    Utah: "Utah is home to five national parks, including Zion and Arches.",
    Vermont: "Vermont is famous for maple syrup and colorful fall leaves.",
    Virginia: "Virginia has many landmarks tied to the country's early history.",
    Washington: "Washington is home to Seattle and Mount Rainier.",
    "West Virginia": "West Virginia is known for mountain scenery and winding rivers.",
    Wisconsin: "Wisconsin is famous for cheese and dairy farms.",
    Wyoming: "Most of Yellowstone National Park lies in Wyoming.",
  });

  const CONFUSION_GROUPS = Object.freeze([
    ["Alabama", "Mississippi", "Georgia", "Louisiana", "Arkansas"],
    ["Alaska", "Washington", "Oregon", "Montana"],
    ["Arizona", "New Mexico", "Utah", "Colorado", "Nevada"],
    ["Arkansas", "Missouri", "Tennessee", "Kentucky", "Louisiana", "Mississippi"],
    ["California", "Oregon", "Washington", "Nevada", "Arizona"],
    ["Colorado", "Wyoming", "Utah", "New Mexico", "Kansas", "Nebraska"],
    ["Connecticut", "Rhode Island", "Massachusetts", "New Jersey", "Delaware"],
    ["Delaware", "Maryland", "New Jersey", "Rhode Island", "Connecticut"],
    ["Florida", "Georgia", "South Carolina", "Alabama"],
    ["Georgia", "Alabama", "South Carolina", "North Carolina", "Florida"],
    ["Hawaii", "Alaska", "California"],
    ["Idaho", "Montana", "Wyoming", "Utah", "Washington", "Oregon"],
    ["Illinois", "Indiana", "Iowa", "Missouri", "Wisconsin", "Michigan"],
    ["Indiana", "Illinois", "Ohio", "Kentucky", "Michigan"],
    ["Iowa", "Nebraska", "Kansas", "Illinois", "Minnesota", "Missouri"],
    ["Kansas", "Nebraska", "Colorado", "Oklahoma", "Iowa", "Missouri"],
    ["Kentucky", "Tennessee", "West Virginia", "Virginia", "Missouri", "Arkansas"],
    ["Louisiana", "Mississippi", "Arkansas", "Alabama", "Texas"],
    ["Maine", "New Hampshire", "Vermont", "Massachusetts"],
    ["Maryland", "Delaware", "New Jersey", "Rhode Island", "Connecticut", "Massachusetts"],
    ["Massachusetts", "Connecticut", "Rhode Island", "New Jersey", "Maryland"],
    ["Michigan", "Wisconsin", "Minnesota", "Ohio", "Indiana"],
    ["Minnesota", "Wisconsin", "Michigan", "Iowa", "North Dakota", "South Dakota"],
    ["Mississippi", "Alabama", "Louisiana", "Arkansas", "Georgia"],
    ["Missouri", "Arkansas", "Iowa", "Illinois", "Tennessee", "Kentucky", "Nebraska", "Kansas", "Oklahoma"],
    ["Montana", "Wyoming", "Idaho", "North Dakota", "South Dakota"],
    ["Nebraska", "Kansas", "South Dakota", "Colorado", "Wyoming", "Iowa"],
    ["Nevada", "Utah", "Arizona", "California", "New Mexico", "Oregon"],
    ["New Hampshire", "Vermont", "Maine", "Massachusetts", "Connecticut"],
    ["New Jersey", "Delaware", "Connecticut", "Rhode Island", "Massachusetts", "Maryland"],
    ["New Mexico", "Arizona", "Colorado", "Utah", "Texas", "Nevada"],
    ["New York", "Pennsylvania", "New Jersey", "Massachusetts", "Vermont"],
    ["North Carolina", "South Carolina", "Virginia", "Georgia", "Tennessee"],
    ["North Dakota", "South Dakota", "Montana", "Minnesota", "Nebraska"],
    ["Ohio", "Indiana", "Michigan", "Pennsylvania", "Kentucky", "West Virginia"],
    ["Oklahoma", "Texas", "Kansas", "Colorado", "New Mexico", "Arkansas", "Missouri"],
    ["Oregon", "Washington", "California", "Nevada", "Idaho"],
    ["Pennsylvania", "New York", "Ohio", "New Jersey", "Maryland", "West Virginia"],
    ["Rhode Island", "Connecticut", "Massachusetts", "New Jersey", "Delaware"],
    ["South Carolina", "North Carolina", "Georgia", "Virginia", "Florida"],
    ["South Dakota", "North Dakota", "Nebraska", "Wyoming", "Montana", "Minnesota"],
    ["Tennessee", "Kentucky", "Virginia", "North Carolina", "Arkansas", "Missouri", "Mississippi", "Alabama", "Georgia"],
    ["Texas", "Oklahoma", "New Mexico", "Louisiana", "Arkansas"],
    ["Utah", "Colorado", "Arizona", "Nevada", "Wyoming", "New Mexico", "Idaho"],
    ["Vermont", "New Hampshire", "Maine", "Massachusetts", "New York"],
    ["Virginia", "West Virginia", "North Carolina", "Tennessee", "Kentucky", "Maryland"],
    ["Washington", "Oregon", "Idaho", "Montana", "California"],
    ["West Virginia", "Virginia", "Kentucky", "Ohio", "Pennsylvania", "Maryland"],
    ["Wisconsin", "Minnesota", "Michigan", "Illinois", "Iowa"],
    ["Wyoming", "Colorado", "Montana", "South Dakota", "Nebraska", "Utah", "Idaho"],
  ]);

  function slugify(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function buildConfusionMap(groups) {
    const map = new Map();

    for (const group of groups) {
      for (const stateName of group) {
        const existing = map.get(stateName) ?? new Set();
        for (const candidate of group) {
          if (candidate !== stateName) {
            existing.add(candidate);
          }
        }
        map.set(stateName, existing);
      }
    }

    return map;
  }

  const confusionMap = buildConfusionMap(CONFUSION_GROUPS);

  const MODE_CONFIG = Object.freeze({
    challenge: Object.freeze({
      id: "challenge",
      label: "Challenge",
      rounds: 10,
      questionMs: 15000,
      countdownMs: 3200,
      revealMs: 2400,
      timed: true,
      manualAdvance: false,
      allowHints: true,
      mapEnabled: false,
      endsOnMistake: false,
      description: "Ten fast rounds with a timer, streaks, and a final score card.",
    }),
    practice: Object.freeze({
      id: "practice",
      label: "Practice",
      rounds: null,
      questionMs: null,
      countdownMs: 3200,
      revealMs: 0,
      timed: false,
      manualAdvance: true,
      allowHints: true,
      mapEnabled: false,
      endsOnMistake: false,
      description: "Unlimited rounds with no timer so learners can slow down and study each outline.",
    }),
    "know-it-all": Object.freeze({
      id: "know-it-all",
      label: "Know it all!",
      rounds: 50,
      questionMs: null,
      countdownMs: 3200,
      revealMs: 0,
      timed: false,
      manualAdvance: false,
      allowHints: false,
      mapEnabled: true,
      endsOnMistake: true,
      description: "Fill the map. No misses.",
    }),
  });

  const STATE_DATABASE = Object.freeze(
    OFFICIAL_STATES.map((name) =>
      Object.freeze({
        id: slugify(name),
        name,
        region: REGION_BY_STATE[name],
        assetPath: `${ASSET_ROOT}/${name}/${name}.png`,
        funFact: FUN_FACT_BY_STATE[name],
        voicePrompt: null,
        voicePath: null,
        confusionSet: Object.freeze([...(confusionMap.get(name) ?? [])]),
      })
    )
  );
  const MAP_FILL_PALETTE = Object.freeze([
    "#ff7d6e",
    "#ffb14f",
    "#ffd54a",
    "#b7ea61",
    "#63de8e",
    "#47d4c2",
    "#55c3ff",
    "#4f96ff",
    "#7f8cff",
    "#b086ff",
    "#f08edb",
    "#ff91ad",
  ]);

  const STATE_NAME_SET = new Set(OFFICIAL_STATES);
  const STATE_DATABASE_BY_ID = new Map(STATE_DATABASE.map((entry) => [entry.id, entry]));
  const STATE_DATABASE_BY_NAME = new Map(STATE_DATABASE.map((entry) => [entry.name, entry]));
  const STATE_PROGRESS_COLORS = Object.freeze(
    Object.fromEntries(
      STATE_DATABASE.map((entry, index) => [entry.id, MAP_FILL_PALETTE[index % MAP_FILL_PALETTE.length]])
    )
  );
  const STATE_HINT_DATA = Object.freeze(
    Object.fromEntries(
      Object.entries(rawHintData).map(([stateId, entry]) => [
        stateId,
        Object.freeze({
          neighbors: Object.freeze([...(entry.neighbors ?? [])]),
          contextType: entry.contextType,
          viewMode: entry.viewMode ?? (entry.neighbors?.length ? "regional-zoom" : "none"),
          clusterBounds: Object.freeze([...(entry.clusterBounds ?? [0, 0])]),
          clusterStateIds: Object.freeze([...(entry.clusterStateIds ?? [])]),
          pieces: Object.freeze(
            Object.fromEntries(
              Object.entries(entry.pieces ?? {}).map(([pieceId, piece]) => [
                pieceId,
                Object.freeze({
                  bounds: Object.freeze([...(piece.bounds ?? [0, 0, 0, 0])]),
                  paths: Object.freeze([...(piece.paths ?? [])]),
                }),
              ])
            )
          ),
        }),
      ])
    )
  );
  const US_PROGRESS_MAP_DATA = Object.freeze({
    viewBox: Object.freeze([...(rawUsMapData.viewBox ?? [0, 0])]),
    stateIds: Object.freeze([...(rawUsMapData.stateIds ?? [])]),
    states: Object.freeze(
      Object.fromEntries(
        Object.entries(rawUsMapData.states ?? {}).map(([stateId, entry]) => [
          stateId,
          Object.freeze({
            name: entry.name,
            bounds: Object.freeze([...(entry.bounds ?? [0, 0, 0, 0])]),
            paths: Object.freeze([...(entry.paths ?? [])]),
          }),
        ])
      )
    ),
  });

  function auditStateDatabase() {
    const missingRegions = [];
    const missingFacts = [];
    const badPaths = [];
    const missingHintData = [];
    const missingMapData = [];

    for (const state of STATE_DATABASE) {
      if (!state.region) {
        missingRegions.push(state.name);
      }

      if (!state.funFact) {
        missingFacts.push(state.name);
      }

      if (state.assetPath !== `${ASSET_ROOT}/${state.name}/${state.name}.png`) {
        badPaths.push(state.name);
      }

      if (!STATE_HINT_DATA[state.id]) {
        missingHintData.push(state.name);
      }

      if (!US_PROGRESS_MAP_DATA.states?.[state.id]?.paths?.length) {
        missingMapData.push(state.name);
      }
    }

    return {
      totalStates: STATE_DATABASE.length,
      ignoredDirectories: NON_STATE_FOLDERS,
      missingRegions,
      missingFacts,
      badPaths,
      missingHintData,
      missingMapData,
    };
  }

  const namespace = Object.freeze({
    HINT_DURATION_MS,
    HINTS_PER_SESSION,
    MODE_CONFIG,
    NON_STATE_FOLDERS,
    OFFICIAL_STATES,
    STATE_DATABASE,
    STATE_DATABASE_BY_ID,
    STATE_DATABASE_BY_NAME,
    STATE_HINT_DATA,
    STATE_PROGRESS_COLORS,
    STATE_NAME_SET,
    US_PROGRESS_MAP_DATA,
    auditStateDatabase,
  });

  Object.defineProperty(window, "StatesChampionData", {
    value: namespace,
    writable: false,
    configurable: true,
  });
})();
