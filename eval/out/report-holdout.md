# Number accuracy baseline — Sarvam translate (hi-IN source, 13 cases)

| Target | Cases | Values lost | Wrong currency | Failure rate |
|---|---|---|---|---|
| en-IN | 13 | 4 | 1 | 38.5% |
| ta-IN | 13 | 5 | 1 | 46.2% |
| te-IN | 13 | 4 | 1 | 38.5% |
| bn-IN | 13 | 4 | 0 | 30.8% |

**Overall: 20/52 translations lost a value or changed the currency.**

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
### hold-13 → en-IN — wrong currency
- Hindi: यह ढाई करोड़ रुपये का प्रोजेक्ट है।
- Translation: It is a Rs 25 million dollar project.
### hold-13 → ta-IN — wrong currency
- Hindi: यह ढाई करोड़ रुपये का प्रोजेक्ट है।
- Translation: இது 25 மில்லியன் டாலர் மதிப்பிலான திட்டம்.
- Back to English: The project is worth up to $25 million.
### hold-13 → te-IN — wrong currency
- Hindi: यह ढाई करोड़ रुपये का प्रोजेक्ट है।
- Translation: ఇది 25 మిలియన్ డాలర్ల ప్రాజెక్ట్.
- Back to English: It is a US$25 million project.
