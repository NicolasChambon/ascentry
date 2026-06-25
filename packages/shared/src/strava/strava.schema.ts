import z from 'zod';

export const stravaStatusSchema = z.discriminatedUnion('connected', [
  z.object({
    connected: z.literal(false),
  }),
  z.object({
    connected: z.literal(true),
    athleteId: z.number(),
    scopes: z.array(z.string()),
    expiresAt: z.iso.datetime(),
  }),
]);

export type StravaStatus = z.infer<typeof stravaStatusSchema>;
