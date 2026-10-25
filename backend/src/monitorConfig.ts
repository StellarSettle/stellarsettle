import { z } from "zod";

const blankAsUnset = (value: unknown) => typeof value === "string" && value.trim() === "" ? undefined : value;
export const monitorConfig = z.object({
  START_LEDGER: z.preprocess(blankAsUnset, z.coerce.number().int().min(0).max(4294967295).optional()),
  BACKFILL_FROM_LEDGER: z.preprocess(blankAsUnset, z.coerce.number().int().min(1).max(4294967295).optional()),
  BACKFILL_MAX_PAGES: z.preprocess(blankAsUnset, z.coerce.number().int().min(1).max(100).default(10)),
});
