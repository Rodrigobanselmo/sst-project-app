// The planner tests inject only the Expo OS boundary. The persistence core is
// separately exercised against real filesystem copies in durable-media.test.cjs.
let persist = async () => { throw new Error('Synthetic media is unavailable on this operating-system boundary.'); };
exports.persistVisitMedia = (...args) => persist(...args);
exports.setPersistence = (value) => { persist = value; };
