import { z } from "zod";

import { isValidCalendarDate } from "./date-validation";

const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);
const blankToZero = (value: unknown) => (value === "" || value === null || value === undefined ? 0 : value);
const optionalDate = z.preprocess(blankToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai harus berformat YYYY-MM-DD.").refine(isValidCalendarDate, "Tanggal mulai tidak valid.").optional());

export const blockFormSchema = z.object({
  code: z.string().trim().min(1, "Kode blok wajib diisi.").max(32, "Kode blok maksimal 32 karakter."),
  name: z.string().trim().min(1, "Nama blok wajib diisi.").max(160, "Nama blok maksimal 160 karakter."),
  status: z.enum(["ACTIVE", "STOPPED", "NOT_OPERATING"], { required_error: "Pilih status blok." }),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"], { required_error: "Pilih prioritas blok." }),
  latitude: z.preprocess(blankToUndefined, z.coerce.number({ invalid_type_error: "Latitude wajib diisi." }).finite("Latitude harus berupa angka.").min(-90, "Latitude harus antara -90 dan 90.").max(90, "Latitude harus antara -90 dan 90.")),
  longitude: z.preprocess(blankToUndefined, z.coerce.number({ invalid_type_error: "Longitude wajib diisi." }).finite("Longitude harus berupa angka.").min(-180, "Longitude harus antara -180 dan 180.").max(180, "Longitude harus antara -180 dan 180.")),
  areaHectares: z.preprocess(blankToUndefined, z.coerce.number().finite("Luas harus berupa angka.").min(0, "Luas tidak boleh negatif.").max(1000000, "Luas maksimal 1.000.000 hektar.").optional()),
  managerName: z.string().trim().max(160, "Nama pengelola maksimal 160 karakter."),
  locationPicName: z.string().trim().max(160, "PJ lokasi maksimal 160 karakter."),
  fieldPicName: z.string().trim().max(160, "PJ lapangan maksimal 160 karakter."),
  contact: z.string().trim().max(64, "Kontak maksimal 64 karakter."),
  workerCount: z.preprocess(blankToZero, z.coerce.number({ invalid_type_error: "Jumlah pekerja wajib berupa angka." }).int("Jumlah pekerja harus bilangan bulat.").min(0, "Jumlah pekerja tidak boleh negatif.").max(100000, "Jumlah pekerja maksimal 100.000.")),
  operationalCondition: z.string().trim().min(1, "Kondisi operasional wajib diisi.").max(5000, "Kondisi operasional maksimal 5.000 karakter."),
  startDate: optionalDate,
  notes: z.string().max(5000, "Catatan maksimal 5.000 karakter."),
});

export type BlockFormValues = z.infer<typeof blockFormSchema>;
