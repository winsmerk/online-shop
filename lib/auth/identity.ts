import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "账号至少 3 个字符")
  .max(32, "账号最多 32 个字符")
  .regex(/^[a-z0-9][a-z0-9._-]*$/, "账号只能包含小写字母、数字、点、下划线或连字符");

export const passwordSchema = z.string().min(8, "密码至少 8 个字符").max(128, "密码过长");

export function usernameToInternalEmail(username: string) {
  return `${usernameSchema.parse(username)}@users.invalid`;
}

