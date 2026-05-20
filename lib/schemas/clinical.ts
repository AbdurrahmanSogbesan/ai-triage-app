import { z } from "zod";

export const vitalsSchema = z.object({
  bpSys: z
    .number({ message: "Required" })
    .int()
    .min(50, "Too low — check the reading")
    .max(250, "Too high — check the reading"),
  bpDia: z
    .number({ message: "Required" })
    .int()
    .min(30, "Too low — check the reading")
    .max(150, "Too high — check the reading"),
  tempC: z
    .number({ message: "Required" })
    .min(30, "Too low — check the reading")
    .max(45, "Too high — check the reading"),
  weightKg: z
    .number({ message: "Required" })
    .min(2, "Too low — check the reading")
    .max(300, "Too high — check the reading"),
});
export type VitalsInput = z.infer<typeof vitalsSchema>;

export const chiefComplaintSchema = z.object({
  complaint: z
    .string()
    .trim()
    .min(3, "Tell us a little more about what's going on"),
});
export type ChiefComplaintInput = z.infer<typeof chiefComplaintSchema>;

export const overrideSchema = z
  .object({
    level: z.enum(["red", "orange", "yellow", "green", "blue"]),
    reason: z.string().trim().optional(),
    aiLevel: z.enum(["red", "orange", "yellow", "green", "blue"]),
  })
  .superRefine((data, ctx) => {
    if (data.level !== data.aiLevel) {
      if (!data.reason || data.reason.length < 10) {
        ctx.addIssue({
          code: "custom",
          path: ["reason"],
          message:
            "Give at least 10 characters of context when overriding the AI label.",
        });
      }
    }
  });
export type OverrideInput = z.infer<typeof overrideSchema>;
