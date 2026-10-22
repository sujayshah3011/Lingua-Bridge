# Number accuracy baseline — Sarvam translate (hi-IN source, 36 cases)

| Target | Cases | Values lost | Wrong currency | Failure rate |
|---|---|---|---|---|
| en-IN | 36 | 1 | 1 | 5.6% |
| ta-IN | 36 | 2 | 1 | 8.3% |
| te-IN | 36 | 2 | 1 | 8.3% |
| bn-IN | 36 | 3 | 0 | 8.3% |

**Overall: 11/144 translations lost a value or changed the currency.**

## Failures
### clinic-10 → en-IN — wrong currency
- Hindi: ऑपरेशन का खर्च लगभग सवा लाख रुपये आएगा।
- Translation: The operation cost about 125 thousand rubles.
### clinic-10 → ta-IN — wrong currency
- Hindi: ऑपरेशन का खर्च लगभग सवा लाख रुपये आएगा।
- Translation: இந்த அறுவை சிகிச்சைக்கு சுமார் 125 ஆயிரம் ரூபிள் செலவானது.
- Back to English: The surgery cost about 125 thousand rubles.
### clinic-10 → te-IN — wrong currency
- Hindi: ऑपरेशन का खर्च लगभग सवा लाख रुपये आएगा।
- Translation: ఆపరేషన్ ఖర్చు సుమారు 125 వేల రూబిళ్లు.
- Back to English: The cost of the operation was about 125 thousand rubles.
### clinic-10 → bn-IN — lost [125000]
- Hindi: ऑपरेशन का खर्च लगभग सवा लाख रुपये आएगा।
- Translation: অপারেশনটির খরচ প্রায় এক কোটি পঁচিশ লক্ষ টাকা।
- Back to English: The cost of the operation is approximately 12.5 million rupees.
### clinic-12 → bn-IN — lost [1.5]
- Hindi: डेढ़ गोली सुबह खाली पेट लेनी है।
- Translation: সকালে খালি পেটে দেড়টি ট্যাবলেট খেতে হবে।
- Back to English: The tablets should be taken on an empty stomach first thing in the morning.
### clinic-13 → en-IN — lost [8.75]
- Hindi: पौने नौ बजे तक खाली पेट रहना है, फिर टेस्ट होगा।
- Translation: You have to stay on an empty stomach until 9:45, then there will be a test.
### clinic-13 → ta-IN — lost [8.75]
- Hindi: पौने नौ बजे तक खाली पेट रहना है, फिर टेस्ट होगा।
- Translation: நீங்கள் 9:45 வரை வெறும் வயிற்றில் இருக்க வேண்டும், பிறகு ஒரு சோதனை இருக்கும்.
- Back to English: You will need to be on an empty stomach until 9:45, and then take a test.
### clinic-13 → te-IN — lost [8.75]
- Hindi: पौने नौ बजे तक खाली पेट रहना है, फिर टेस्ट होगा।
- Translation: మీరు 9:45 వరకు ఖాళీ కడుపుతో ఉండాలి, ఆ తర్వాత పరీక్ష ఉంటుంది.
- Back to English: You will need to be on an empty stomach until 9:45, after which there will be a test.
### clinic-13 → bn-IN — lost [8.75]
- Hindi: पौने नौ बजे तक खाली पेट रहना है, फिर टेस्ट होगा।
- Translation: আপনাকে 9টা 45 মিনিট পর্যন্ত খালি পেটে থাকতে হবে, তারপর একটি পরীক্ষা হবে।
- Back to English: You will need to be fasting for 9½ hours, then take a test.
### field-04 → ta-IN — lost [7500]
- Hindi: किराया साढ़े सात हज़ार महीना है और दो महीने का एडवांस देना होगा।
- Translation: மாத வாடகை ஏழாயிரத்து ஐம்பது, மேலும் நீங்கள் இரண்டு மாத முன்பணம் செலுத்த வேண்டும்.
- Back to English: The monthly rent is seven thousand and fifty, and you have to pay two months' deposit.
### field-04 → te-IN — lost [7500]
- Hindi: किराया साढ़े सात हज़ार महीना है और दो महीने का एडवांस देना होगा।
- Translation: అద్దె నెలకు ఏడున్నర వేలు, మరియు మీరు రెండు నెలల అడ్వాన్స్ చెల్లించాలి.
- Back to English: The rent is seven and a half hundred rupees per month, and you have to pay two months' advance.
