export const DEBUG_LOGGING = false;

export const debugLog = DEBUG_LOGGING
    ? console.log.bind(console)
    : () => {};
