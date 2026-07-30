// Object.hasOwn on its own does not rule out a property that is explicitly
// set to undefined, so callers that need to distinguish "missing" from
// "present but undefined" from "present and defined" use this to check the
// last case.
export function hasDefinedProperty(obj: object, key: string): boolean {
  return (
    Object.hasOwn(obj, key) &&
    (obj as Record<string, unknown>)[key] !== undefined
  );
}
