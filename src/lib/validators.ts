import { z } from "zod";

export const TitleTypeEnum = z.enum(["movie", "series", "anime"]);
export type TitleTypeValue = z.infer<typeof TitleTypeEnum>;

export const TitleStatusEnum = z.enum([
  "planned",
  "watching",
  "completed",
  "on_hold",
  "dropped",
]);
export type TitleStatusValue = z.infer<typeof TitleStatusEnum>;

export const posterUrlSchema = z
  .string()
  .trim()
  .max(2048, "URL poster maksimal 2.048 karakter.")
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL poster wajib diawali https://" }
  );

export const watchLinkUrlSchema = z
  .string()
  .trim()
  .min(1, "URL link wajib diisi.")
  .max(2048, "URL link maksimal 2.048 karakter.")
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "URL link wajib memakai skema http:// atau https://" }
  );

export const titleInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Judul wajib diisi.")
      .max(200, "Judul maksimal 200 karakter."),
    type: TitleTypeEnum,
    status: TitleStatusEnum.default("planned"),
    year: z
      .number()
      .int("Tahun harus berupa bilangan bulat.")
      .min(1888, "Tahun minimal 1888.")
      .max(2100, "Tahun maksimal 2100.")
      .nullable()
      .optional(),
    posterUrl: posterUrlSchema.nullable().optional(),
    rating: z
      .number()
      .int("Rating harus berupa bilangan bulat.")
      .min(1, "Rating minimal 1.")
      .max(10, "Rating maksimal 10.")
      .nullable()
      .optional(),
    episodeCurrent: z
      .number()
      .int("Episode saat ini harus bilangan bulat.")
      .min(0, "Episode saat ini minimal 0.")
      .default(0),
    episodeTotal: z
      .number()
      .int("Total episode harus bilangan bulat.")
      .min(1, "Total episode minimal 1.")
      .max(10000, "Total episode terlalu besar.")
      .nullable()
      .optional(),
    notes: z
      .string()
      .max(2000, "Catatan maksimal 2.000 karakter.")
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.type !== "movie" &&
      data.episodeTotal != null &&
      data.episodeCurrent > data.episodeTotal
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["episodeTotal"],
        message: "Total episode tidak boleh lebih kecil dari progres episode saat ini.",
      });
    }
  });

export type TitleInput = z.input<typeof titleInputSchema>;
export type ParsedTitleInput = z.output<typeof titleInputSchema>;

export const watchLinkInputSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label link wajib diisi (mis. Netflix).")
    .max(40, "Label link maksimal 40 karakter."),
  url: watchLinkUrlSchema,
});

export type WatchLinkInput = z.input<typeof watchLinkInputSchema>;
export type ParsedWatchLinkInput = z.output<typeof watchLinkInputSchema>;

export const notesInputSchema = z.object({
  notes: z
    .string()
    .max(2000, "Catatan maksimal 2.000 karakter.")
    .nullable()
    .optional(),
});

