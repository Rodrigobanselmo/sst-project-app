let fetchChanges = async () => { throw new Error('No synthetic remote response configured.'); };
exports.getSyncCharacterization = (...args) => fetchChanges(...args);
exports.setPullResponse = (value) => { fetchChanges = value; };
