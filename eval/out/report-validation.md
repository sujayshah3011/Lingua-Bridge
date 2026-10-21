# Number accuracy baseline — Sarvam translate (hi-IN source, 20 cases)

| Target | Cases | Values lost | Wrong currency | Failure rate |
|---|---|---|---|---|
| en-IN | 20 | 5 | 0 | 25.0% |
| ta-IN | 20 | 6 | 0 | 30.0% |
| te-IN | 20 | 6 | 0 | 30.0% |
| bn-IN | 20 | 5 | 0 | 25.0% |

**Overall: 22/80 translations lost a value or changed the currency.**

## Failures
### val-01 → en-IN — lost [8.25]
- Hindi: मरीज़ को सवा आठ बजे इंजेक्शन लगेगा।
- Translation: The patient will have an injection at 12:30.
### val-01 → ta-IN — lost [8.25]
- Hindi: मरीज़ को सवा आठ बजे इंजेक्शन लगेगा।
- Translation: நோயாளியின் உடலில் 12:50 மணிக்கு ஊசி செலுத்தப்படும்.
- Back to English: The needle is put into the patient's body at 12:50.
### val-01 → te-IN — lost [8.25]
- Hindi: मरीज़ को सवा आठ बजे इंजेक्शन लगेगा।
- Translation: రోగికి 12:30 గంటలకు ఇంజెక్షన్ ఉంటుంది.
- Back to English: The patient is to be injected with 12:30.
### val-01 → bn-IN — lost [8.25]
- Hindi: मरीज़ को सवा आठ बजे इंजेक्शन लगेगा।
- Translation: রোগীর 12:30-এ একটি ইনজেকশন দেওয়া হবে।
- Back to English: The patient will be given an injection at 12:30.
### val-03 → en-IN — lost [11.75]
- Hindi: पौने बारह बजे तक फॉर्म जमा कर दीजिए।
- Translation: Submit the form by 12:30 PM.
### val-03 → ta-IN — lost [11.75]
- Hindi: पौने बारह बजे तक फॉर्म जमा कर दीजिए।
- Translation: பிற்பகல் 12:30 மணிக்குள் படிவத்தை சமர்ப்பிக்கவும்.
- Back to English: Submit the form by 12:30 PM.
### val-03 → te-IN — lost [11.75]
- Hindi: पौने बारह बजे तक फॉर्म जमा कर दीजिए।
- Translation: ఫారమ్‌ను మధ్యాహ్నం 12:30 గంటలకల్లా సమర్పించండి.
- Back to English: Submit the form by 12:30 p.m.
### val-03 → bn-IN — lost [11.75]
- Hindi: पौने बारह बजे तक फॉर्म जमा कर दीजिए।
- Translation: ফর্মটি দুপুর 12:30 এর মধ্যে জমা দিন।
- Back to English: Submit the form by 12:30 p.m.
### val-07 → en-IN — lost [5250]
- Hindi: आपके खाते से सवा पाँच हज़ार रुपये कटे हैं।
- Translation: Five thousand five hundred rupees have been deducted from your account.
### val-07 → ta-IN — lost [5250]
- Hindi: आपके खाते से सवा पाँच हज़ार रुपये कटे हैं।
- Translation: உங்கள் கணக்கிலிருந்து ஐந்தாயிரத்து ஐந்நூறு ரூபாய் பிடித்தம் செய்யப்பட்டுள்ளது.
- Back to English: Five thousand five hundred rupees have been deducted from your account.
### val-07 → te-IN — lost [5250]
- Hindi: आपके खाते से सवा पाँच हज़ार रुपये कटे हैं।
- Translation: మీ ఖాతా నుండి ఐదు వేల ఐదు వందల రూపాయలు తీసివేయబడ్డాయి.
- Back to English: Five thousand five hundred rupees have been deducted from your account.
### val-07 → bn-IN — lost [5250]
- Hindi: आपके खाते से सवा पाँच हज़ार रुपये कटे हैं।
- Translation: আপনার অ্যাকাউন্ট থেকে পাঁচ হাজার পাঁচশ টাকা কাটা হয়েছে।
- Back to English: Five thousand five hundred rupees have been deducted from your account.
### val-08 → en-IN — lost [375000]
- Hindi: पौने चार लाख रुपये का घर का लोन बचा है।
- Translation: I have a home loan of ₹4.25 lakh remaining.
### val-08 → ta-IN — lost [375000]
- Hindi: पौने चार लाख रुपये का घर का लोन बचा है।
- Translation: எனக்கு சுமார் நான்கரை லட்சம் ரூபாய் வீட்டுக் கடன் மீதமுள்ளது.
- Back to English: I have approximately four and a half lakh rupees remaining as a home loan.
### val-08 → te-IN — lost [375000]
- Hindi: पौने चार लाख रुपये का घर का लोन बचा है।
- Translation: నాకు దాదాపు నాలుగు కోట్ల నలభై వేల రూపాయల గృహ రుణం ఇంకా మిగిలి ఉంది.
- Back to English: I still have a home loan of approximately four crore forty thousand rupees.
### val-08 → bn-IN — lost [375000]
- Hindi: पौने चार लाख रुपये का घर का लोन बचा है।
- Translation: আমার প্রায় সাড়ে চার লক্ষ টাকার একটি গৃহঋণ বাকি আছে।
- Back to English: I have a home loan of approximately four and a half lakh rupees remaining.
### val-12 → ta-IN — lost [1.25]
- Hindi: बच्चे को सवा चम्मच दवा दें।
- Translation: குழந்தைக்கு ஒன்றரை தேக்கரண்டி மருந்து கொடுங்கள்.
- Back to English: Give the child one and a half teaspoons of medicine.
### val-12 → te-IN — lost [1.25]
- Hindi: बच्चे को सवा चम्मच दवा दें।
- Translation: పిల్లవాడికి ఒకటిన్నర టీస్పూన్ల మందు ఇవ్వండి.
- Back to English: Give the child one and a half teaspoons of the medicine.
### val-13 → en-IN — lost [1.75]
- Hindi: पौने दो लीटर पानी रोज़ पीना है।
- Translation: Three-quarters of a liter of water should be drunk daily.
### val-13 → ta-IN — lost [1.75]
- Hindi: पौने दो लीटर पानी रोज़ पीना है।
- Translation: தினமும் முக்கால் லிட்டர் தண்ணீர் குடிக்க வேண்டும்.
- Back to English: Three-quarters of a liter of water should be drunk every day.
### val-13 → te-IN — lost [1.75]
- Hindi: पौने दो लीटर पानी रोज़ पीना है।
- Translation: రోజుకు మూడు వంతుల లీటరు నీరు తాగాలి.
- Back to English: Three-quarters of a liter of water a day.
### val-13 → bn-IN — lost [1.75]
- Hindi: पौने दो लीटर पानी रोज़ पीना है।
- Translation: প্রতিদিন পৌনে এক লিটার জল পান করা উচিত।
- Back to English: A quarter to three litres of water should be drunk per day.
