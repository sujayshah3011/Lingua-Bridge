// node --experimental-strip-types eval/reminder.test.mjs
import { strictEqual as eq } from "node:assert";
import { validateReminder as validate } from "../artifacts/api-server/src/lib/reminder.ts";

const ok = { consent: true, language: "hi-IN", phone: "+919876543210", lines: ["8:45 बजे तक खाली पेट रहना है।"] };
eq(validate(ok), null);
eq(validate({ ...ok, consent: undefined }), "consent_required");
eq(validate({ ...ok, consent: "yes" }), "consent_required");
eq(validate({ ...ok, language: "ta-IN" }), "only_hindi_supported");
eq(validate({ ...ok, phone: "9876543210" }), "invalid_phone");
eq(validate({ ...ok, phone: "+91 98765 43210" }), "invalid_phone");
eq(validate({ ...ok, phone: "+915876543210" }), "invalid_phone"); // landline-style prefix
eq(validate({ ...ok, phone: "+14155550100" }), "invalid_phone");
eq(validate({ ...ok, lines: [] }), "invalid_lines");
eq(validate({ ...ok, lines: Array(11).fill("x") }), "invalid_lines");
eq(validate({ ...ok, lines: ["  "] }), "invalid_lines");
eq(validate({ ...ok, lines: ["x".repeat(201)] }), "invalid_lines");
eq(validate({ ...ok, lines: [42] }), "invalid_lines");
eq(validate({ ...ok, scheduledAt: new Date(Date.now() + 3600e3).toISOString() }), null);
eq(validate({ ...ok, scheduledAt: new Date(Date.now() - 60e3).toISOString() }), "invalid_schedule");
eq(validate({ ...ok, scheduledAt: new Date(Date.now() + 8 * 86400e3).toISOString() }), "invalid_schedule");
eq(validate({ ...ok, scheduledAt: "tomorrow" }), "invalid_schedule");
console.log("reminder self-check passed");
