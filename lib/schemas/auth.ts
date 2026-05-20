import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "Required"),
    lastName: z.string().trim().min(1, "Required"),
    dob: z.string().min(1, "Required"),
    sex: z.enum(["M", "F"]),
    phone: z
      .string()
      .trim()
      .regex(/^\+?\d[\d\s-]{6,}$/, "Enter a valid phone number"),
    email: z.email("Enter a valid email").trim(),
    password: z.string().min(8, "Use 8 or more characters"),
    confirmPassword: z.string(),
    consent: z
      .boolean()
      .refine((v) => v === true, { message: "Please accept to continue" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;
