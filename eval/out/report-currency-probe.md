# Number accuracy baseline — Sarvam translate (hi-IN source, 4 cases)

| Target | Cases | Values lost | Wrong currency | Failure rate |
|---|---|---|---|---|
| en-IN | 4 | 3 | 0 | 75.0% |
| ta-IN | 4 | 2 | 0 | 50.0% |
| te-IN | 4 | 3 | 0 | 75.0% |
| bn-IN | 4 | 3 | 0 | 75.0% |

**Overall: 11/16 translations lost a value or changed the currency.**

## Failures
### probe-symbol-1 → en-IN — lost [125000]
- Hindi: ऑपरेशन का खर्च लगभग ₹1 लाख 25 हज़ार आएगा।
- Translation: The operation cost approximately ₹1.25 million.
### probe-symbol-1 → ta-IN — lost [125000]
- Hindi: ऑपरेशन का खर्च लगभग ₹1 लाख 25 हज़ार आएगा।
- Translation: இந்த அறுவை சிகிச்சைக்கு சுமார் ₹1.25 மில்லியன் செலவானது.
- Back to English: The surgery cost about ₹1.25 million.
### probe-symbol-1 → te-IN — lost [125000]
- Hindi: ऑपरेशन का खर्च लगभग ₹1 लाख 25 हज़ार आएगा।
- Translation: ఆపరేషన్ ఖర్చు సుమారు ₹1.25 మిలియన్లు.
- Back to English: The cost of the operation was about ₹1.25 million.
### probe-symbol-1 → bn-IN — lost [125000]
- Hindi: ऑपरेशन का खर्च लगभग ₹1 लाख 25 हज़ार आएगा।
- Translation: অপারেশনটির খরচ ছিল প্রায় ₹12.5 লক্ষ টাকা।
- Back to English: The cost of the surgery was about Rs. 12.5 lakh.
### probe-symbol-2 → en-IN — lost [25000000]
- Hindi: यह ₹2 करोड़ 50 लाख का प्रोजेक्ट है।
- Translation: It is a ₹250 million project.
### probe-symbol-2 → ta-IN — lost [25000000]
- Hindi: यह ₹2 करोड़ 50 लाख का प्रोजेक्ट है।
- Translation: இது ₹250 மில்லியன் மதிப்பிலான திட்டம்.
- Back to English: The project is estimated to cost about $250 million.
### probe-symbol-2 → te-IN — lost [25000000]
- Hindi: यह ₹2 करोड़ 50 लाख का प्रोजेक्ट है।
- Translation: ఇది 25 కోట్ల రూపాయల ప్రాజెక్ట్.
- Back to English: The film is a Rs 25 crore production.
### probe-symbol-2 → bn-IN — lost [25000000]
- Hindi: यह ₹2 करोड़ 50 लाख का प्रोजेक्ट है।
- Translation: এটি 25 কোটি টাকার একটি প্রকল্প।
- Back to English: It is a Rs 250 million dollar project.
### probe-indian-2 → en-IN — lost [25000000]
- Hindi: यह 2 करोड़ 50 लाख भारतीय रुपये का प्रोजेक्ट है।
- Translation: It is a project with a total cost of ₹250 million.
### probe-indian-2 → te-IN — lost [25000000]
- Hindi: यह 2 करोड़ 50 लाख भारतीय रुपये का प्रोजेक्ट है।
- Translation: ఇది మొత్తం 250 మిలియన్ల రూపాయల వ్యయంతో కూడిన ప్రాజెక్ట్.
- Back to English: It is a Rs. 250 million project.
### probe-indian-2 → bn-IN — lost [25000000]
- Hindi: यह 2 करोड़ 50 लाख भारतीय रुपये का प्रोजेक्ट है।
- Translation: এটি 25 কোটি টাকা মোট ব্যয়ের একটি প্রকল্প।
- Back to English: It is a Rs 250 million dollar project.
