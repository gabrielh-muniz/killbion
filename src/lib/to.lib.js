/**
 * Function to convert a promise into a tuple of [error, data]
 * @param {Promise<any>} promise - The promise to convert
 * @returns {Promise<[Error | null, any | null]>} - A promise that resolves to a tuple
 */
export async function to(promise) {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null];
  }
}
