/**
 * BhaashAI Phrasebook — Pre-loaded offline phrases
 *
 * 30 essential phrases across 6 categories, translated into 8 major
 * Indian languages. All data is stored inline (no API call needed).
 */

export type PhraseCategory =
  | "Greetings"
  | "Food"
  | "Travel"
  | "Emergency"
  | "Numbers"
  | "Shopping";

export interface Phrase {
  id: string;
  category: PhraseCategory;
  english: string;
  translations: Partial<Record<string, string>>;
  starred?: boolean;
}

export const PHRASE_CATEGORIES: PhraseCategory[] = [
  "Greetings",
  "Food",
  "Travel",
  "Emergency",
  "Numbers",
  "Shopping",
];

export const PHRASES: Phrase[] = [
  // Greetings
  {
    id: "g1",
    category: "Greetings",
    english: "Hello / Namaste",
    translations: {
      "hi-IN": "नमस्ते",
      "ta-IN": "வணக்கம்",
      "te-IN": "నమస్కారం",
      "kn-IN": "ನಮಸ್ಕಾರ",
      "ml-IN": "നമസ്കാരം",
      "bn-IN": "নমস্কার",
      "mr-IN": "नमस्कार",
      "gu-IN": "નમસ્તે",
    },
  },
  {
    id: "g2",
    category: "Greetings",
    english: "Good morning",
    translations: {
      "hi-IN": "सुप्रभात",
      "ta-IN": "காலை வணக்கம்",
      "te-IN": "శుభోదయం",
      "kn-IN": "ಶುಭೋದಯ",
      "ml-IN": "സുപ്രഭാതം",
      "bn-IN": "শুভ সকাল",
      "mr-IN": "सुप्रभात",
      "gu-IN": "સુપ્રભાત",
    },
  },
  {
    id: "g3",
    category: "Greetings",
    english: "Thank you",
    translations: {
      "hi-IN": "धन्यवाद",
      "ta-IN": "நன்றி",
      "te-IN": "ధన్యవాదాలు",
      "kn-IN": "ಧನ್ಯವಾದಗಳು",
      "ml-IN": "നന്ദി",
      "bn-IN": "ধন্যবাদ",
      "mr-IN": "धन्यवाद",
      "gu-IN": "આભાર",
    },
  },
  {
    id: "g4",
    category: "Greetings",
    english: "How are you?",
    translations: {
      "hi-IN": "आप कैसे हैं?",
      "ta-IN": "நீங்கள் எப்படி இருக்கிறீர்கள்?",
      "te-IN": "మీరు ఎలా ఉన్నారు?",
      "kn-IN": "ನೀವು ಹೇಗಿದ್ದೀರಿ?",
      "ml-IN": "സുഖമാണോ?",
      "bn-IN": "আপনি কেমন আছেন?",
      "mr-IN": "तुम्ही कसे आहात?",
      "gu-IN": "તમે કેમ છો?",
    },
  },
  {
    id: "g5",
    category: "Greetings",
    english: "Goodbye",
    translations: {
      "hi-IN": "अलविदा",
      "ta-IN": "விடை",
      "te-IN": "వీడ్కోలు",
      "kn-IN": "ಶುಭವಿದಾಯ",
      "ml-IN": "വിട",
      "bn-IN": "বিদায়",
      "mr-IN": "निरोप",
      "gu-IN": "આવજો",
    },
  },
  // Food
  {
    id: "f1",
    category: "Food",
    english: "I am hungry",
    translations: {
      "hi-IN": "मुझे भूख लगी है",
      "ta-IN": "எனக்கு பசிக்கிறது",
      "te-IN": "నాకు ఆకలిగా ఉంది",
      "kn-IN": "ನನಗೆ ಹಸಿವಾಗಿದೆ",
      "ml-IN": "എനിക്ക് വിശക്കുന്നു",
      "bn-IN": "আমার খিদে পেয়েছে",
      "mr-IN": "मला भूक लागली आहे",
      "gu-IN": "મને ભૂખ લાગી છે",
    },
  },
  {
    id: "f2",
    category: "Food",
    english: "Water, please",
    translations: {
      "hi-IN": "पानी, कृपया",
      "ta-IN": "தண்ணீர், தயவுசெய்து",
      "te-IN": "నీళ్ళు, దయచేసి",
      "kn-IN": "ನೀರು, ದಯವಿಟ್ಟು",
      "ml-IN": "വെള്ളം, ദയവായി",
      "bn-IN": "জল, দয়া করে",
      "mr-IN": "पाणी, कृपया",
      "gu-IN": "પાણી, કૃપા કરીને",
    },
  },
  {
    id: "f3",
    category: "Food",
    english: "The food is delicious",
    translations: {
      "hi-IN": "खाना बहुत स्वादिष्ट है",
      "ta-IN": "உணவு மிகவும் சுவையாக உள்ளது",
      "te-IN": "భోజనం చాలా రుచిగా ఉంది",
      "kn-IN": "ಊಟ ತುಂಬಾ ರುಚಿಯಾಗಿದೆ",
      "ml-IN": "ഭക്ഷണം വളരെ രുചിയുള്ളതാണ്",
      "bn-IN": "খাবারটা খুব সুস্বাদু",
      "mr-IN": "जेवण खूप चविष्ट आहे",
      "gu-IN": "ભોજન ખૂબ સ્વાદિષ્ટ છે",
    },
  },
  {
    id: "f4",
    category: "Food",
    english: "I am vegetarian",
    translations: {
      "hi-IN": "मैं शाकाहारी हूँ",
      "ta-IN": "நான் சைவமானவன்",
      "te-IN": "నేను శాఖాహారిని",
      "kn-IN": "ನಾನು ಸಸ್ಯಾಹಾರಿ",
      "ml-IN": "ഞാൻ സസ്യഭക്ഷകൻ",
      "bn-IN": "আমি নিরামিষাশী",
      "mr-IN": "मी शाकाहारी आहे",
      "gu-IN": "હું શાકાહારી છું",
    },
  },
  {
    id: "f5",
    category: "Food",
    english: "The bill, please",
    translations: {
      "hi-IN": "बिल, कृपया",
      "ta-IN": "கணக்கு, தயவுசெய்து",
      "te-IN": "బిల్లు, దయచేసి",
      "kn-IN": "ಬಿಲ್, ದಯವಿಟ್ಟು",
      "ml-IN": "ബിൽ, ദയവായി",
      "bn-IN": "বিল, দয়া করে",
      "mr-IN": "बिल, कृपया",
      "gu-IN": "બિલ, કૃપા કરીને",
    },
  },
  // Travel
  {
    id: "t1",
    category: "Travel",
    english: "Where is the station?",
    translations: {
      "hi-IN": "स्टेशन कहाँ है?",
      "ta-IN": "நிலையம் எங்கே?",
      "te-IN": "స్టేషన్ ఎక్కడ ఉంది?",
      "kn-IN": "ನಿಲ್ದಾಣ ಎಲ್ಲಿದೆ?",
      "ml-IN": "സ്റ്റേഷൻ എവിടെ?",
      "bn-IN": "স্টেশন কোথায়?",
      "mr-IN": "स्टेशन कुठे आहे?",
      "gu-IN": "સ્ટેશન ક્યાં છે?",
    },
  },
  {
    id: "t2",
    category: "Travel",
    english: "How much does it cost?",
    translations: {
      "hi-IN": "इसकी कीमत कितनी है?",
      "ta-IN": "இதன் விலை எவ்வளவு?",
      "te-IN": "ఇది ఎంత ఖర్చవుతుంది?",
      "kn-IN": "ಇದರ ಬೆಲೆ ಎಷ್ಟು?",
      "ml-IN": "ഇതിന്റെ വില എത്ര?",
      "bn-IN": "এর দাম কত?",
      "mr-IN": "याची किंमत किती आहे?",
      "gu-IN": "આ કેટલામાં છે?",
    },
  },
  {
    id: "t3",
    category: "Travel",
    english: "Please call a taxi",
    translations: {
      "hi-IN": "कृपया टैक्सी बुलाएं",
      "ta-IN": "தயவுசெய்து டாக்சி அழைக்கவும்",
      "te-IN": "దయచేసి టాక్సీ పిలవండి",
      "kn-IN": "ದಯವಿಟ್ಟು ಟ್ಯಾಕ್ಸಿ ಕರೆಯಿರಿ",
      "ml-IN": "ദയവായി ടാക്സി വിളിക്കൂ",
      "bn-IN": "দয়া করে ট্যাক্সি ডাকুন",
      "mr-IN": "कृपया टॅक्सी बोलवा",
      "gu-IN": "કૃપા કરીને ટેક્સી બોલાવો",
    },
  },
  {
    id: "t4",
    category: "Travel",
    english: "I am lost",
    translations: {
      "hi-IN": "मैं रास्ता भूल गया हूँ",
      "ta-IN": "நான் வழி தொலைத்துவிட்டேன்",
      "te-IN": "నాకు దారి తెలియడం లేదు",
      "kn-IN": "ನಾನು ದಾರಿ ತಪ್ಪಿದ್ದೇನೆ",
      "ml-IN": "ഞാൻ വഴി തെറ്റി",
      "bn-IN": "আমি হারিয়ে গেছি",
      "mr-IN": "मी रस्ता चुकलो",
      "gu-IN": "હું ખોવાઈ ગઈ",
    },
  },
  {
    id: "t5",
    category: "Travel",
    english: "Take me to the hospital",
    translations: {
      "hi-IN": "मुझे अस्पताल ले चलो",
      "ta-IN": "என்னை மருத்துவமனைக்கு அழைத்து செல்லுங்கள்",
      "te-IN": "నన్ను ఆసుపత్రికి తీసుకు వెళ్ళండి",
      "kn-IN": "ನನ್ನನ್ನು ಆಸ್ಪತ್ರೆಗೆ ಕರೆದೊಯ್ಯಿ",
      "ml-IN": "എന്നെ ആശുപത്രിയിൽ കൊണ്ടുപോകൂ",
      "bn-IN": "আমাকে হাসপাতালে নিয়ে যান",
      "mr-IN": "मला रुग्णालयात घेऊन चला",
      "gu-IN": "મને હોસ્પિટલ લઈ જાઓ",
    },
  },
  // Emergency
  {
    id: "e1",
    category: "Emergency",
    english: "Help!",
    translations: {
      "hi-IN": "मदद करो!",
      "ta-IN": "உதவி!",
      "te-IN": "సహాయం!",
      "kn-IN": "ಸಹಾಯ!",
      "ml-IN": "സഹായം!",
      "bn-IN": "সাহায্য!",
      "mr-IN": "मदत!",
      "gu-IN": "મદદ!",
    },
  },
  {
    id: "e2",
    category: "Emergency",
    english: "Call the police",
    translations: {
      "hi-IN": "पुलिस को बुलाओ",
      "ta-IN": "போலீசை அழையுங்கள்",
      "te-IN": "పోలీసులను పిలవండి",
      "kn-IN": "ಪೊಲೀಸರಿಗೆ ಕರೆ ಮಾಡಿ",
      "ml-IN": "പൊലീസിനെ വിളിക്കൂ",
      "bn-IN": "পুলিশ ডাকুন",
      "mr-IN": "पोलिसांना बोलवा",
      "gu-IN": "પોલીસ બોલાવો",
    },
  },
  {
    id: "e3",
    category: "Emergency",
    english: "I need a doctor",
    translations: {
      "hi-IN": "मुझे डॉक्टर चाहिए",
      "ta-IN": "எனக்கு மருத்துவர் தேவை",
      "te-IN": "నాకు డాక్టర్ కావాలి",
      "kn-IN": "ನನಗೆ ವೈದ್ಯರು ಬೇಕು",
      "ml-IN": "എനിക്ക് ഡോക്ടർ വേണം",
      "bn-IN": "আমার ডাক্তার দরকার",
      "mr-IN": "मला डॉक्टर हवे आहेत",
      "gu-IN": "મને ડૉક્ટર જોઈએ",
    },
  },
  {
    id: "e4",
    category: "Emergency",
    english: "Fire!",
    translations: {
      "hi-IN": "आग!",
      "ta-IN": "தீ!",
      "te-IN": "అగ్ని!",
      "kn-IN": "ಬೆಂಕಿ!",
      "ml-IN": "തീ!",
      "bn-IN": "আগুন!",
      "mr-IN": "आग!",
      "gu-IN": "આગ!",
    },
  },
  {
    id: "e5",
    category: "Emergency",
    english: "I am allergic to peanuts",
    translations: {
      "hi-IN": "मुझे मूंगफली से एलर्जी है",
      "ta-IN": "எனக்கு வேர்க்கடலையில் ஒவ்வாமை உள்ளது",
      "te-IN": "నాకు వేరుసెనగలకు అలర్జీ ఉంది",
      "kn-IN": "ನನಗೆ ಕಡಲೆಕಾಯಿಯಿಂದ ಅಲರ್ಜಿ ಇದೆ",
      "ml-IN": "എനിക്ക് കടലക്ക് അലർജി ഉണ്ട്",
      "bn-IN": "আমার চিনাবাদামে অ্যালার্জি আছে",
      "mr-IN": "मला शेंगदाण्यांची ॲलर्जी आहे",
      "gu-IN": "મને મગફળીથી એલર્જી છે",
    },
  },
  // Numbers
  {
    id: "n1",
    category: "Numbers",
    english: "One, Two, Three",
    translations: {
      "hi-IN": "एक, दो, तीन",
      "ta-IN": "ஒன்று, இரண்டு, மூன்று",
      "te-IN": "ఒకటి, రెండు, మూడు",
      "kn-IN": "ಒಂದು, ಎರಡು, ಮೂರು",
      "ml-IN": "ഒന്ന്, രണ്ട്, മൂന്ന്",
      "bn-IN": "এক, দুই, তিন",
      "mr-IN": "एक, दोन, तीन",
      "gu-IN": "એક, બે, ત્રણ",
    },
  },
  {
    id: "n2",
    category: "Numbers",
    english: "How many?",
    translations: {
      "hi-IN": "कितने?",
      "ta-IN": "எத்தனை?",
      "te-IN": "ఎన్ని?",
      "kn-IN": "ಎಷ್ಟು?",
      "ml-IN": "എത്ര?",
      "bn-IN": "কতটি?",
      "mr-IN": "किती?",
      "gu-IN": "કેટલા?",
    },
  },
  {
    id: "n3",
    category: "Numbers",
    english: "One hundred rupees",
    translations: {
      "hi-IN": "सौ रुपए",
      "ta-IN": "நூறு ரூபாய்",
      "te-IN": "వంద రూపాయలు",
      "kn-IN": "ನೂರು ರೂಪಾಯಿ",
      "ml-IN": "നൂറ് രൂപ",
      "bn-IN": "একশো টাকা",
      "mr-IN": "शंभर रुपये",
      "gu-IN": "સો રૂપિયા",
    },
  },
  // Shopping
  {
    id: "s1",
    category: "Shopping",
    english: "How much is this?",
    translations: {
      "hi-IN": "यह कितने का है?",
      "ta-IN": "இது எவ்வளவு?",
      "te-IN": "ఇది ఎంత?",
      "kn-IN": "ಇದು ಎಷ್ಟು?",
      "ml-IN": "ഇതിന് എത്ര?",
      "bn-IN": "এটা কত?",
      "mr-IN": "हे किती आहे?",
      "gu-IN": "આ કેટલું છે?",
    },
  },
  {
    id: "s2",
    category: "Shopping",
    english: "Too expensive",
    translations: {
      "hi-IN": "बहुत महंगा है",
      "ta-IN": "மிகவும் விலை அதிகம்",
      "te-IN": "చాలా ఖరీదైంది",
      "kn-IN": "ತುಂಬಾ ದುಬಾರಿ",
      "ml-IN": "വളരെ ചിലവേറിയത്",
      "bn-IN": "অনেক দামী",
      "mr-IN": "खूप महाग आहे",
      "gu-IN": "ઘણું મોંઘું છે",
    },
  },
  {
    id: "s3",
    category: "Shopping",
    english: "Do you have a smaller size?",
    translations: {
      "hi-IN": "क्या आपके पास छोटा साइज़ है?",
      "ta-IN": "உங்களிடம் சிறிய அளவு உள்ளதா?",
      "te-IN": "మీ దగ్గర చిన్న సైజు ఉందా?",
      "kn-IN": "ನಿಮ್ಮ ಬಳಿ ಚಿಕ್ಕ ಸೈಜ್ ಇದೆಯೇ?",
      "ml-IN": "ചെറിയ സൈസ് ഉണ്ടോ?",
      "bn-IN": "আপনার কাছে ছোট সাইজ আছে?",
      "mr-IN": "तुमच्याकडे छोटा आकार आहे का?",
      "gu-IN": "તમારી પાસે નાનો સાઇઝ છે?",
    },
  },
  {
    id: "s4",
    category: "Shopping",
    english: "I'll take it",
    translations: {
      "hi-IN": "मैं इसे लूंगा",
      "ta-IN": "நான் இதை எடுப்பேன்",
      "te-IN": "నేను దీన్ని తీసుకుంటాను",
      "kn-IN": "ನಾನು ಇದನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತೇನೆ",
      "ml-IN": "ഞാൻ ഇത് എടുക്കും",
      "bn-IN": "আমি এটা নেব",
      "mr-IN": "मी हे घेईन",
      "gu-IN": "હું આ લઈશ",
    },
  },
  {
    id: "s5",
    category: "Shopping",
    english: "Can I pay by card?",
    translations: {
      "hi-IN": "क्या मैं कार्ड से भुगतान कर सकता हूँ?",
      "ta-IN": "நான் கார்டால் பணம் செலுத்தலாமா?",
      "te-IN": "నేను కార్డు ద్వారా చెల్లించవచ్చా?",
      "kn-IN": "ನಾನು ಕಾರ್ಡ್‌ನಲ್ಲಿ ಪಾವತಿ ಮಾಡಬಹುದೇ?",
      "ml-IN": "കാർഡ് വഴി പണം നൽകാമോ?",
      "bn-IN": "আমি কার্ড দিয়ে পেমেন্ট করতে পারি?",
      "mr-IN": "मी कार्डने पेमेंट करू शकतो का?",
      "gu-IN": "શું હું કાર્ડથી ચૂકવી શકું?",
    },
  },
];

/** Return all phrases for a given category */
export function getPhrasesByCategory(cat: PhraseCategory): Phrase[] {
  return PHRASES.filter((p) => p.category === cat);
}

/** Return all unique categories that have phrases */
export function getCategories(): PhraseCategory[] {
  return PHRASE_CATEGORIES;
}
