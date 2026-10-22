# Number accuracy with Hindi number normalization — Sarvam translate (hi-IN source, 13 cases)

| Target | Cases | Values lost | Wrong currency | Failure rate |
|---|---|---|---|---|
| en-IN | 13 | 0 | 0 | 0.0% |
| ta-IN | 13 | 0 | 0 | 0.0% |
| te-IN | 13 | 0 | 0 | 0.0% |
| bn-IN | 13 | 1 | 0 | 7.7% |

**Overall: 1/52 translations lost a value or changed the currency.**

## Runtime number check

| Errors left | Caught | Missed | False alarms | Needed a back-translation | Fixed by falling back to original wording |
|---|---|---|---|---|---|
| 1 | 1 | 0 | 0/51 | 1/52 | 0 |

## Failures
### hold-06 → bn-IN — lost [7.25]
- Hindi: सवा सात बजे मरीज़ को ऑपरेशन थिएटर में ले जाएँगे।
- Sent as: 7:15 बजे मरीज़ को ऑपरेशन थिएटर में ले जाएँगे।
- Translation: সাড়ে সাতটায় রোগীকে অপারেশন থিয়েটারে নিয়ে যাওয়া হয়।
- Back to English: At 7:30 a.m., the patient was taken to the operating theatre.
