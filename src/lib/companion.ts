/**
 * Display identity for the companion.
 *
 * This is the UI-facing name (header, avatar). It is intentionally
 * separate from `src/lib/persona.ts`, which controls how the model talks.
 *
 * The current display name is "Lumi", but that is not a finalized
 * companion identity. Changing the name later should only require
 * updating this object (and optionally `defaultPersona.name` if the
 * model should also know the name).
 */

export const companionIdentity = {
  name: "Lumi",
  avatarInitial: "L",
} as const;
