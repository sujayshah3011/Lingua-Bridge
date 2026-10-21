# Number accuracy with Hindi number normalization — Sarvam translate (hi-IN source, 20 cases)

| Target | Cases | Values lost | Wrong currency | Failure rate |
|---|---|---|---|---|
| en-IN | 20 | 1 | 1 | 10.0% |
| ta-IN | 20 | 1 | 1 | 10.0% |
| te-IN | 20 | 1 | 1 | 10.0% |
| bn-IN | 20 | 0 | 1 | 5.0% |

**Overall: 7/80 translations lost a value or changed the currency.**

## Runtime number check

| Real errors | Caught | Missed | False alarms | Needed a back-translation |
|---|---|---|---|---|
| 7 | 5 | 2 | 0/73 | 4/80 |

Missed:
- val-12 → ta-IN: குழந்தைக்கு ஒன்றரை தேக்கரண்டி மருந்து கொடுங்கள். (back: Give the child one and a half teaspoons of medicine.) — check said {"ok":true,"missing":[],"wrongCurrency":false,"backTranslated":false}
- val-12 → te-IN: పిల్లవాడికి ఒకటిన్నర టీస్పూన్ల మందు ఇవ్వండి. (back: Give the child one and a half teaspoons of the medicine.) — check said {"ok":true,"missing":[],"wrongCurrency":false,"backTranslated":false}

## Failures
### val-11 → en-IN — wrong currency
- Hindi: हर महीने ढाई हज़ार रुपये बचाइए।
- Sent as: हर महीने 2500 रुपये बचाइए।
- Translation: Save $2500 each month.
### val-11 → ta-IN — wrong currency
- Hindi: हर महीने ढाई हज़ार रुपये बचाइए।
- Sent as: हर महीने 2500 रुपये बचाइए।
- Translation: ஒவ்வொரு மாதமும் $2,500 சேமிக்கவும்.
- Back to English: Save $2,500 each month.
### val-11 → te-IN — wrong currency
- Hindi: हर महीने ढाई हज़ार रुपये बचाइए।
- Sent as: हर महीने 2500 रुपये बचाइए।
- Translation: ప్రతి నెలా $2,500 ఆదా చేసుకోండి.
- Back to English: Save $2,500 each month.
### val-11 → bn-IN — wrong currency
- Hindi: हर महीने ढाई हज़ार रुपये बचाइए।
- Sent as: हर महीने 2500 रुपये बचाइए।
- Translation: প্রতি মাসে 2500 ডলার বাঁচান।
- Back to English: Save $2,500 each month.
### val-12 → ta-IN — lost [1.25]
- Hindi: बच्चे को सवा चम्मच दवा दें।
- Translation: குழந்தைக்கு ஒன்றரை தேக்கரண்டி மருந்து கொடுங்கள்.
- Back to English: Give the child one and a half teaspoons of medicine.
### val-12 → te-IN — lost [1.25]
- Hindi: बच्चे को सवा चम्मच दवा दें।
- Translation: పిల్లవాడికి ఒకటిన్నర టీస్పూన్ల మందు ఇవ్వండి.
- Back to English: Give the child one and a half teaspoons of the medicine.
### val-20 → en-IN — lost [700,2]
- Hindi: मज़दूरों को 700 रुपये रोज़ और 2 बार खाना मिलेगा।
- Translation: The workers would be paid Rs. 700 and two meals a day.
