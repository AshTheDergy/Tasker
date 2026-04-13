// Airtable returns attachments as [{ url: "..." }], local uploads store the
// same shape, and occasionally the field is a plain string or null.
// This basically makes the Airtable attachment magic work
// I hope
export function extractMediaUrl(field) {
  if (!field) return null;
  if (Array.isArray(field) && field.length > 0) return field[0]?.url ?? null;
  if (typeof field === "string" && field.length > 0) return field;
  return null;
}