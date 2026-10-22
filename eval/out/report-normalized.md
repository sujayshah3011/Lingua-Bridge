# Number accuracy with Hindi number normalization — Sarvam translate (hi-IN source, 36 cases)

| Target | Cases | Values lost | Wrong currency | Failure rate |
|---|---|---|---|---|
| en-IN | 36 | 0 | 1 | 2.8% |
| ta-IN | 36 | 0 | 1 | 2.8% |
| te-IN | 36 | 0 | 1 | 2.8% |
| bn-IN | 36 | 0 | 1 | 2.8% |

**Overall: 4/144 translations lost a value or changed the currency.**

## Runtime number check

| Errors left | Caught | Missed | False alarms | Needed a back-translation | Fixed by falling back to original wording |
|---|---|---|---|---|---|
| 4 | 4 | 0 | 0/140 | 1/144 | 0 |

## Failures
### clinic-10 → en-IN — wrong currency
- Hindi: ऑपरेशन का खर्च लगभग सवा लाख रुपये आएगा।
- Sent as: ऑपरेशन का खर्च लगभग 1 लाख 25 हज़ार रुपये आएगा।
- Translation: The operation cost approximately 125 thousand rubles.
### clinic-10 → ta-IN — wrong currency
- Hindi: ऑपरेशन का खर्च लगभग सवा लाख रुपये आएगा।
- Sent as: ऑपरेशन का खर्च लगभग 1 लाख 25 हज़ार रुपये आएगा।
- Translation: இந்த அறுவை சிகிச்சைக்கு சுமார் 125 ஆயிரம் ரூபிள் செலவானது.
- Back to English: The surgery cost about 125 thousand rubles.
### clinic-10 → te-IN — wrong currency
- Hindi: ऑपरेशन का खर्च लगभग सवा लाख रुपये आएगा।
- Sent as: ऑपरेशन का खर्च लगभग 1 लाख 25 हज़ार रुपये आएगा।
- Translation: ఆపరేషన్ ఖర్చు సుమారు 125 వేల రూబిళ్లు.
- Back to English: The cost of the operation was about 125 thousand rubles.
### clinic-10 → bn-IN — wrong currency
- Hindi: ऑपरेशन का खर्च लगभग सवा लाख रुपये आएगा।
- Sent as: ऑपरेशन का खर्च लगभग 1 लाख 25 हज़ार रुपये आएगा।
- Translation: অপারেশনটির খরচ প্রায় 125 হাজার রুবেল।
- Back to English: The cost of the operation was about 125 thousand rubles.
