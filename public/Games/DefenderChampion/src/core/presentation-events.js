export const PRESENTATION_EVENT_LIMIT = 512;

const ensurePresentationState = (simulation) => {
  if (!Array.isArray(simulation.presentationEvents)) simulation.presentationEvents = [];
  if (!Number.isInteger(simulation.nextPresentationEventId) || simulation.nextPresentationEventId < 1) {
    simulation.nextPresentationEventId = 1;
  }
};

export const emitPresentationEvent = (simulation, kind, payload = {}) => {
  ensurePresentationState(simulation);
  const event = {
    id: simulation.nextPresentationEventId,
    kind,
    payload: structuredClone(payload),
    tick: simulation.tick,
  };
  simulation.nextPresentationEventId += 1;
  simulation.presentationEvents.push(event);
  if (simulation.presentationEvents.length > PRESENTATION_EVENT_LIMIT) {
    simulation.presentationEvents.splice(
      0,
      simulation.presentationEvents.length - PRESENTATION_EVENT_LIMIT,
    );
  }
  return event;
};

export const snapshotPresentationEvents = (simulation) => {
  ensurePresentationState(simulation);
  return simulation.presentationEvents.map((event) => structuredClone(event));
};

export const clearPresentationEvents = (simulation) => {
  if (!simulation) return;
  simulation.presentationEvents = [];
};
