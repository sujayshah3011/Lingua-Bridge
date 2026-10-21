# Number accuracy baseline — Sarvam translate (hi-IN source, 13 cases)

| Target | Cases | Values lost | Failure rate |
|---|---|---|---|
| en-IN | 13 | 4 | 30.8% |
| ta-IN | 13 | 5 | 38.5% |
| te-IN | 13 | 4 | 30.8% |
| bn-IN | 13 | 5 | 38.5% |

**Overall: 18/52 translations lost at least one value.**

## Failures
### hold-01 → en-IN — lost [225000]
- Hindi: सवा दो लाख रुपये का बिल बना है।
- Translation: The bill is for two hundred thousand rupees.
### hold-01 → ta-IN — lost [225000]
- Hindi: सवा दो लाख रुपये का बिल बना है।
- Translation: இந்த பில் இரண்டு லட்சம் ரூபாய்.
- Back to English: This bill is two hundred thousand rupees.
### hold-01 → te-IN — lost [225000]
- Hindi: सवा दो लाख रुपये का बिल बना है।
- Translation: బిల్లు రెండు లక్షల రూపాయలు.
- Back to English: The bill is two hundred thousand rupees.
### hold-01 → bn-IN — lost [225000]
- Hindi: सवा दो लाख रुपये का बिल बना है।
- Translation: বিলটি দুই লক্ষ টাকার।
- Back to English: The bill is for two hundred thousand rupees.
### hold-02 → en-IN — lost [275000]
- Hindi: पौने तीन लाख का लोन अभी बाकी है।
- Translation: Three and a quarter lakhs of rupees are still left as a loan.
### hold-02 → ta-IN — lost [275000]
- Hindi: पौने तीन लाख का लोन अभी बाकी है।
- Translation: மூன்று லட்சத்து கால் லட்சம் ரூபாய் இன்னும் கடனாக மீதமுள்ளது.
- Back to English: Three lakh and forty-five thousand rupees are still remaining as a loan.
### hold-02 → te-IN — lost [275000]
- Hindi: पौने तीन लाख का लोन अभी बाकी है।
- Translation: నాలుగున్నర లక్షల రూపాయలు ఇంకా రుణంగా మిగిలి ఉన్నాయి.
- Back to English: Four and a half lakh rupees are still remaining as a loan.
### hold-02 → bn-IN — lost [275000]
- Hindi: पौने तीन लाख का लोन अभी बाकी है।
- Translation: পঁয়ত্রিশ লক্ষ টাকা এখনও ঋণ হিসেবে বাকি আছে।
- Back to English: Thirty-five hundred thousand taka is still outstanding as a loan.
### hold-03 → ta-IN — lost [12500]
- Hindi: साढ़े बारह हज़ार रुपये महीने की सैलरी मिलेगी।
- Translation: எனக்கு மாதச் சம்பளமாக பன்னிரெண்டாயிரத்து ஐம்பதாயிரம் ரூபாய் கிடைக்கும்.
- Back to English: I get a monthly salary of twelve thousand fifty thousand rupees.
### hold-06 → en-IN — lost [7.25]
- Hindi: सवा सात बजे मरीज़ को ऑपरेशन थिएटर में ले जाएँगे।
- Translation: At 7:00, the patient is moved to the operating theatre.
### hold-06 → ta-IN — lost [7.25]
- Hindi: सवा सात बजे मरीज़ को ऑपरेशन थिएटर में ले जाएँगे।
- Translation: 7:00 மணிக்கு, நோயாளி அறுவை சிகிச்சை அறைக்கு கொண்டு செல்லப்படுகிறார்.
- Back to English: At 7:00, the patient is moved to the operating theatre.
### hold-06 → te-IN — lost [7.25]
- Hindi: सवा सात बजे मरीज़ को ऑपरेशन थिएटर में ले जाएँगे।
- Translation: 7:00 గంటలకు, రోగిని ఆపరేషన్ థియేటర్‌కు తరలిస్తారు.
- Back to English: At 7:00, the patient is moved to the operating theatre.
### hold-06 → bn-IN — lost [7.25]
- Hindi: सवा सात बजे मरीज़ को ऑपरेशन थिएटर में ले जाएँगे।
- Translation: সাড়ে সাতটায় রোগীকে অপারেশন থিয়েটারে নিয়ে যাওয়া হয়।
- Back to English: At 7:30 a.m., the patient was taken to the operating theatre.
### hold-07 → en-IN — lost [5.75]
- Hindi: पौने छह बजे तक रिपोर्ट मिल जाएगी।
- Translation: The report will be available by 4:30 PM.
### hold-07 → ta-IN — lost [5.75]
- Hindi: पौने छह बजे तक रिपोर्ट मिल जाएगी।
- Translation: அறிக்கை மாலை 4:30 மணிக்குள் கிடைக்கும்.
- Back to English: The report will be available by 4:30 p.m.
### hold-07 → te-IN — lost [5.75]
- Hindi: पौने छह बजे तक रिपोर्ट मिल जाएगी।
- Translation: నివేదిక సాయంత్రం 4:30 గంటలకు అందుబాటులో ఉంటుంది.
- Back to English: The report will be available by 4:30 p.m.
### hold-07 → bn-IN — lost [5.75]
- Hindi: पौने छह बजे तक रिपोर्ट मिल जाएगी।
- Translation: রিপোর্টটি বিকেল 4:30 এর মধ্যে পাওয়া যাবে।
- Back to English: The report will be available by 4:30 p.m.
### hold-13 → bn-IN — lost [25000000]
- Hindi: यह ढाई करोड़ रुपये का प्रोजेक्ट है।
- Translation: এটি 2 কোটি 50 লক্ষ টাকার একটি প্রকল্প।
- Back to English: It is a Rs 250 million dollar project.
