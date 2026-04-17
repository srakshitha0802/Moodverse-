/**
 * Redux-persist root migration (no-op).
 * Kept in a tiny module to avoid pulling the full storage stack into the entry bundle.
 *
 * @param {object|undefined} state
 * @param {number} _targetVersion
 * @returns {Promise<object|undefined>}
 */
export async function migrate(state, _targetVersion) {
  return state;
}
