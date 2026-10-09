/** Push API field errors (`details`) into react-hook-form; returns true if any field matched. */
export function applyServerErrors(err, setError, fields) {
  let matched = false;
  for (const [key, messages] of Object.entries(err.details ?? {})) {
    if (fields.includes(key)) {
      setError(key, { type: 'server', message: messages[0] });
      matched = true;
    }
  }
  return matched;
}
