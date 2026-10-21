// node --experimental-strip-types eval/number-check.test.mjs
import { deepStrictEqual as eq } from "node:assert";
import {
  checkNumbers, extractNumbers, missing, sourceExpectations,
} from "../artifacts/api-server/src/lib/number-check.ts";

// Lenient reading of a translation: is the value there?
const has = (text, ...vals) => eq(missing(vals, [text]), [], `${text} -> ${extractNumbers(text)}`);
has("Loan of Rs 2,50,000 approved", 250000);
has("two and a half lakh rupees", 250000);
has("1.25 lakh", 125000);
has("one lakh twenty-five thousand", 125000);
has("The total is 1.2 crore", 12000000);
has("one crore twenty lakh rupees", 12000000);
has("12 million rupees", 12000000);
has("come back at half past three", 3.5);
has("come at 3:30", 3.5);
has("stay empty stomach till quarter to nine", 8.75);
has("take it twice a day", 2);
has("one and a half tablets", 1.5);
has("half a tablet", 0.5);
has("Give the child 2½ teaspoons", 2.5);
has("One and half to two tablets", 1.5);
has("two thousand five hundred", 2500);
has("three hundred and fifty rupees", 350);
has("seven and a half thousand per month", 7500);
has("My salary is eighteen thousand, not paid for 3 months", 18000, 3);
has("BP is 150/95", 150, 95);
has("EMI of ₹12,450 on the 5th", 12450, 5);
has("The workers would be paid Rs. 700 and two meals a day.", 700, 2);
has("2 lakh twenty five thousand", 225000);
has("அடுத்த சோதனை ௧௫ நவம்பர்", 15);
has("next check-up on 15 November", 15, "november");
has("call me on 98765 43210", { digits: "9876543210" });
has("OTP is four seven one nine", { digits: "4719" });
// Native scale words.
has("சுமார் 125 ஆயிரம் இந்திய ரூபாய்", 125000);
has("మొత్తం 2 లక్షల 25 వేల రూపాయలు", 225000);
has("এটি 25 কোটি টাকার একটি প্রকল্প।", 250000000);
has("এটি 2 কোটি 50 লক্ষ টাকার", 25000000);
has("₹1.25 மில்லியன்", 1250000);
eq(missing([250000], ["a loan of 2.5 rupees"]), [250000]);
eq(missing([8.75], ["come at 9"]), [8.75]);
eq(missing([25000000], ["a project of 2,500,000 rupees"]), [25000000]);

// Strict reading of the (normalized) Hindi source.
const src = (text) => sourceExpectations(text).map((e) => ("value" in e ? e.value : e.digits));
eq(src("8:45 बजे तक खाली पेट रहना है"), [8.75]);
eq(src("ऑपरेशन का खर्च लगभग 1 लाख 25 हज़ार रुपये आएगा।"), [125000]);
eq(src("यह 2 करोड़ 50 लाख रुपये का प्रोजेक्ट है।"), [25000000]);
eq(src("बीमा का प्रीमियम 18 हज़ार रुपये सालाना है।"), [18000]);
eq(src("मरीज़ का ब्लड प्रेशर 150 बटा 95 है।"), [150, 95]);
eq(src("मेरा नंबर 98765 43210 है"), ["9876543210"]);
eq(src("डिलीवरी का OTP 4 7 1 9 है।"), ["4719"]);
eq(src("आपकी EMI 12,450 रुपये हर महीने की 5 तारीख को कटेगी।"), [12450, 5]);
eq(src("यह कोर्स पूरे सात दिन चलेगा"), []);
eq(src("कुल रकम एक करोड़ बीस लाख रुपये है।"), []);
eq(src("हर महीने दो हज़ार पाँच सौ रुपये की किस्त"), []);
eq(sourceExpectations("ट्रेन 10:45 पर छूटेगी").map((e) => e.label), ["10:45"]);

// The full check, with a stubbed back-translation.
const back = (text) => async () => text;
eq(await checkNumbers("7:15 बजे ले जाएँगे", "7:15 மணிக்கு", back("unused")),
  { ok: true, missing: [], wrongCurrency: false, backTranslated: false });
eq(await checkNumbers("7:15 बजे ले जाएँगे", "সাড়ে সাতটায় নিয়ে যাওয়া হয়", back("At 7:30 a.m.")),
  { ok: false, missing: ["7:15"], wrongCurrency: false, backTranslated: true });
eq(await checkNumbers("ढाई चम्मच", "இரண்டரை தேக்கரண்டி", back("two and a half teaspoons")),
  { ok: true, missing: [], wrongCurrency: false, backTranslated: false });
eq(await checkNumbers("2.5 चम्मच", "இரண்டரை தேக்கரண்டி", back("two and a half teaspoons")),
  { ok: true, missing: [], wrongCurrency: false, backTranslated: true });
eq(await checkNumbers("लगभग 1 लाख 25 हज़ार रुपये आएगा", "about 125 thousand rubles", null),
  { ok: false, missing: [], wrongCurrency: true, backTranslated: false });
eq(await checkNumbers("यह 2 करोड़ 50 लाख रुपये का है", "It is a ₹250 million project.", null),
  { ok: false, missing: ["2,50,00,000"], wrongCurrency: false, backTranslated: false });
console.log("number-check self-check passed");
