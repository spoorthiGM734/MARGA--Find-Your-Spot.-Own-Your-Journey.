/* MARGA language support: English / हिन्दी / ಕನ್ನಡ.
   A small translator that swaps known English phrases on the page (including text the pages create later) for Hindi or Kannada.
   Phrases that are not in the dictionary simply stay in English. Translations were drafted with AI help - please have a native speaker review them. */
(function () {
  const D = {
    // ---- navigation / common ----
    'Find parking': ['पार्किंग खोजें', 'ಪಾರ್ಕಿಂಗ್ ಹುಡುಕಿ'], 'Dashboard': ['डैशबोर्ड', 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್'], 'Log in': ['लॉग इन', 'ಲಾಗ್ ಇನ್'], 'Sign up': ['साइन अप', 'ಸೈನ್ ಅಪ್'],
    'Install app': ['ऐप इंस्टॉल करें', 'ಆ್ಯಪ್ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಿ'], 'Loading…': ['लोड हो रहा है…', 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…'], 'Search': ['खोजें', 'ಹುಡುಕಿ'], 'Cancel': ['रद्द करें', 'ರದ್ದುಗೊಳಿಸಿ'],
    'Email': ['ईमेल', 'ಇಮೇಲ್'], 'Password': ['पासवर्ड', 'ಪಾಸ್‌ವರ್ಡ್'], 'Phone': ['फ़ोन', 'ಫೋನ್'], 'Full name': ['पूरा नाम', 'ಪೂರ್ಣ ಹೆಸರು'], 'Facility': ['सुविधा', 'ಸೌಲಭ್ಯ'], 'Vehicle': ['वाहन', 'ವಾಹನ'],
    'Time': ['समय', 'ಸಮಯ'], 'Slot': ['स्लॉट', 'ಸ್ಲಾಟ್'], 'Size': ['आकार', 'ಗಾತ್ರ'], 'Features': ['सुविधाएँ', 'ಸೌಲಭ್ಯಗಳು'], 'Fit': ['फिट', 'ಹೊಂದಾಣಿಕೆ'], 'Rate': ['दर', 'ದರ'], 'Price': ['कीमत', 'ಬೆಲೆ'],
    'Estimated cost': ['अनुमानित लागत', 'ಅಂದಾಜು ವೆಚ್ಚ'], 'Booking fee': ['बुकिंग शुल्क', 'ಬುಕಿಂಗ್ ಶುಲ್ಕ'], 'Payment': ['भुगतान', 'ಪಾವತಿ'], 'Copy': ['कॉपी', 'ನಕಲಿಸಿ'], 'Share': ['शेयर', 'ಹಂಚಿಕೊಳ್ಳಿ'],
    'From': ['से', 'ಇಂದ'], 'Until': ['तक', 'ವರೆಗೆ'], 'Car': ['कार', 'ಕಾರು'], 'SUV': ['एसयूवी', 'ಎಸ್‌ಯುವಿ'], 'Bike': ['बाइक', 'ಬೈಕ್'], 'Type': ['प्रकार', 'ಪ್ರಕಾರ'], 'Remove': ['हटाएँ', 'ತೆಗೆಯಿರಿ'],
    'Available': ['उपलब्ध', 'ಲಭ್ಯ'], 'Reserved': ['आरक्षित', 'ಕಾಯ್ದಿರಿಸಿದ'], 'Occupied': ['भरा हुआ', 'ತುಂಬಿದ'], 'Low': ['कम', 'ಕಡಿಮೆ'], 'Moderate': ['मध्यम', 'ಮಧ್ಯಮ'], 'High': ['अधिक', 'ಹೆಚ್ಚು'], 'Very high': ['बहुत अधिक', 'ತುಂಬಾ ಹೆಚ್ಚು'],
    'confirmed': ['पुष्टि हुई', 'ದೃಢಪಟ್ಟಿದೆ'], 'checked in': ['चेक-इन हुआ', 'ಚೆಕ್-ಇನ್ ಆಗಿದೆ'], 'completed': ['पूरा हुआ', 'ಪೂರ್ಣಗೊಂಡಿದೆ'], 'cancelled': ['रद्द', 'ರದ್ದಾಗಿದೆ'], 'no show': ['नहीं आए', 'ಬರಲಿಲ್ಲ'],
    'awaiting payment': ['भुगतान बाकी', 'ಪಾವತಿ ಬಾಕಿ'], 'pending': ['लंबित', 'ಬಾಕಿ'], 'approved': ['स्वीकृत', 'ಅನುಮೋದಿತ'], 'rejected': ['अस्वीकृत', 'ತಿರಸ್ಕೃತ'], 'published': ['प्रकाशित', 'ಪ್ರಕಟಿತ'], 'draft': ['मसौदा', 'ಕರಡು'],
    'open': ['खुला', 'ತೆರೆದಿದೆ'], 'refunded': ['रिफ़ंड हुआ', 'ಮರುಪಾವತಿಯಾಗಿದೆ'], 'Navigate': ['रास्ता दिखाएँ', 'ದಾರಿ ತೋರಿಸಿ'], 'Receipt': ['रसीद', 'ರಸೀದಿ'],
    // ---- landing ----
    'Find Your Spot.': ['अपनी जगह खोजिए।', 'ನಿಮ್ಮ ಜಾಗ ಹುಡುಕಿ.'], 'Own Your Journey.': ['अपना सफ़र अपना बनाइए।', 'ನಿಮ್ಮ ಪ್ರಯಾಣ ನಿಮ್ಮದಾಗಿಸಿ.'],
    'MARGA is a smart parking platform. Search any place, compare verified facilities and their expected rush, pick an exact slot that fits your vehicle, pay online, and follow the drive guide straight to it.':
      ['MARGA एक स्मार्ट पार्किंग प्लेटफ़ॉर्म है। कोई भी जगह खोजिए, सत्यापित पार्किंग और उनकी अपेक्षित भीड़ की तुलना कीजिए, अपने वाहन में फिट होने वाला सही स्लॉट चुनिए, ऑनलाइन भुगतान कीजिए और ड्राइव गाइड के साथ सीधे वहाँ पहुँचिए।',
       'MARGA ಒಂದು ಸ್ಮಾರ್ಟ್ ಪಾರ್ಕಿಂಗ್ ವೇದಿಕೆ. ಯಾವುದೇ ಸ್ಥಳವನ್ನು ಹುಡುಕಿ, ಪರಿಶೀಲಿತ ಪಾರ್ಕಿಂಗ್‌ಗಳು ಮತ್ತು ಅವುಗಳ ನಿರೀಕ್ಷಿತ ದಟ್ಟಣೆಯನ್ನು ಹೋಲಿಸಿ, ನಿಮ್ಮ ವಾಹನಕ್ಕೆ ಹೊಂದುವ ಸ್ಲಾಟ್ ಆರಿಸಿ, ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಪಾವತಿಸಿ ಮತ್ತು ಡ್ರೈವ್ ಗೈಡ್‌ನೊಂದಿಗೆ ನೇರವಾಗಿ ತಲುಪಿ.'],
    'Where are you going? e.g. Select Citywalk, Saket': ['आप कहाँ जा रहे हैं? जैसे: ओरियन मॉल, राजाजीनगर', 'ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ? ಉದಾ: ಓರಿಯನ್ ಮಾಲ್, ರಾಜಾಜಿನಗರ'],
    'Destination-centred search': ['गंतव्य-केंद्रित खोज', 'ಗಮ್ಯಸ್ಥಾನ ಕೇಂದ್ರಿತ ಹುಡುಕಾಟ'], 'Slot-level booking': ['स्लॉट-स्तर की बुकिंग', 'ಸ್ಲಾಟ್ ಮಟ್ಟದ ಬುಕಿಂಗ್'], 'QR booking pass': ['QR बुकिंग पास', 'QR ಬುಕಿಂಗ್ ಪಾಸ್'],
    'Everything parking, in one place': ['पार्किंग की हर सुविधा, एक जगह', 'ಪಾರ್ಕಿಂಗ್‌ಗೆ ಬೇಕಾದ್ದೆಲ್ಲಾ, ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ'],
    'From discovery to receipt, Marga connects drivers and parking operators on a single, software-first platform.': ['खोज से लेकर रसीद तक, मार्ग ड्राइवरों और पार्किंग संचालकों को एक ही सॉफ़्टवेयर-आधारित प्लेटफ़ॉर्म पर जोड़ता है।', 'ಹುಡುಕಾಟದಿಂದ ರಸೀದಿಯವರೆಗೆ, ಮಾರ್ಗ ಚಾಲಕರು ಮತ್ತು ಪಾರ್ಕಿಂಗ್ ನಿರ್ವಾಹಕರನ್ನು ಒಂದೇ ಸಾಫ್ಟ್‌ವೇರ್ ವೇದಿಕೆಯಲ್ಲಿ ಜೋಡಿಸುತ್ತದೆ.'],
    'Destination search': ['गंतव्य खोज', 'ಗಮ್ಯಸ್ಥಾನ ಹುಡುಕಾಟ'], 'Search any place, or use your current location, and see parking nearby on a map.': ['कोई भी जगह खोजिए या अपनी वर्तमान लोकेशन इस्तेमाल कीजिए, और नक्शे पर पास की पार्किंग देखिए।', 'ಯಾವುದೇ ಸ್ಥಳವನ್ನು ಹುಡುಕಿ ಅಥವಾ ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬಳಸಿ, ಹತ್ತಿರದ ಪಾರ್ಕಿಂಗ್ ಅನ್ನು ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ.'],
    'Explained recommendations': ['समझाई गई सिफ़ारिशें', 'ವಿವರಿಸಿದ ಶಿಫಾರಸುಗಳು'], 'Rankings by price, distance and availability, plus an expected-rush forecast – with the reasons shown.': ['कीमत, दूरी और उपलब्धता के आधार पर रैंकिंग, साथ में अपेक्षित भीड़ का पूर्वानुमान – कारणों सहित।', 'ಬೆಲೆ, ದೂರ ಮತ್ತು ಲಭ್ಯತೆಯ ಆಧಾರದ ಶ್ರೇಯಾಂಕ, ಜೊತೆಗೆ ನಿರೀಕ್ಷಿತ ದಟ್ಟಣೆಯ ಮುನ್ಸೂಚನೆ – ಕಾರಣಗಳೊಂದಿಗೆ.'],
    'Digital slot layouts': ['डिजिटल स्लॉट लेआउट', 'ಡಿಜಿಟಲ್ ಸ್ಲಾಟ್ ವಿನ್ಯಾಸ'], 'Operators turn any suitable ground into numbered virtual slots – Slot 31, 32, 33… – no sensors needed.': ['संचालक किसी भी उपयुक्त ज़मीन को क्रमांकित वर्चुअल स्लॉट – स्लॉट 31, 32, 33… – में बदल सकते हैं, किसी सेंसर की ज़रूरत नहीं।', 'ನಿರ್ವಾಹಕರು ಯಾವುದೇ ಸೂಕ್ತ ಜಾಗವನ್ನು ಸಂಖ್ಯೆಯ ವರ್ಚುವಲ್ ಸ್ಲಾಟ್‌ಗಳಾಗಿ – ಸ್ಲಾಟ್ 31, 32, 33… – ಬದಲಾಯಿಸುತ್ತಾರೆ, ಸೆನ್ಸರ್ ಅಗತ್ಯವಿಲ್ಲ.'],
    'Pick your exact slot': ['अपना सही स्लॉट चुनिए', 'ನಿಮ್ಮ ನಿಖರ ಸ್ಲಾಟ್ ಆರಿಸಿ'], 'See the layout, choose Slot 34, and get a booking reference with a QR code.': ['लेआउट देखिए, स्लॉट 34 चुनिए, और QR कोड के साथ बुकिंग संदर्भ पाइए।', 'ವಿನ್ಯಾಸ ನೋಡಿ, ಸ್ಲಾಟ್ 34 ಆರಿಸಿ, QR ಕೋಡ್‌ನೊಂದಿಗೆ ಬುಕಿಂಗ್ ಸಂಖ್ಯೆ ಪಡೆಯಿರಿ.'],
    'No double-booking': ['दोहरी बुकिंग नहीं', 'ಡಬಲ್ ಬುಕಿಂಗ್ ಇಲ್ಲ'], 'Transaction-safe reservations make sure two drivers never hold the same slot at the same time.': ['सुरक्षित आरक्षण यह सुनिश्चित करते हैं कि दो ड्राइवर एक ही समय पर एक ही स्लॉट नहीं पाते।', 'ಸುರಕ್ಷಿತ ಕಾಯ್ದಿರಿಸುವಿಕೆ ಇಬ್ಬರು ಚಾಲಕರು ಒಂದೇ ಸಮಯದಲ್ಲಿ ಒಂದೇ ಸ್ಲಾಟ್ ಪಡೆಯದಂತೆ ನೋಡಿಕೊಳ್ಳುತ್ತದೆ.'],
    'Reserved ≠ occupied': ['आरक्षित ≠ भरा हुआ', 'ಕಾಯ್ದಿರಿಸಿದ್ದು ≠ ತುಂಬಿದ್ದು'], 'Marga tracks reservations and physical occupancy separately, and says so when something is unverified.': ['मार्ग आरक्षण और वास्तविक भराव को अलग-अलग दर्ज करता है, और जो सत्यापित नहीं है उसे साफ़ बताता है।', 'ಮಾರ್ಗ ಕಾಯ್ದಿರಿಸುವಿಕೆ ಮತ್ತು ನಿಜವಾದ ಆಕ್ರಮಣವನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ದಾಖಲಿಸುತ್ತದೆ, ಮತ್ತು ಪರಿಶೀಲಿಸದ್ದನ್ನು ತಿಳಿಸುತ್ತದೆ.'],
    'Check-in, billing, receipts': ['चेक-इन, बिलिंग, रसीदें', 'ಚೆಕ್-ಇನ್, ಬಿಲ್ಲಿಂಗ್, ರಸೀದಿಗಳು'], 'Hourly rates, grace periods, minimum charges and daily caps are applied automatically.': ['प्रति घंटे की दर, ग्रेस अवधि, न्यूनतम शुल्क और दैनिक सीमा अपने आप लागू होती हैं।', 'ಗಂಟೆಯ ದರ, ರಿಯಾಯಿತಿ ಅವಧಿ, ಕನಿಷ್ಠ ಶುಲ್ಕ ಮತ್ತು ದೈನಂದಿನ ಮಿತಿ ತಾನಾಗಿ ಅನ್ವಯವಾಗುತ್ತವೆ.'],
    'Operator dashboard': ['संचालक डैशबोर्ड', 'ನಿರ್ವಾಹಕ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್'], 'Register facilities, mark entry and exit gates, generate layouts, set tariffs, and manage bookings and sessions.': ['सुविधाएँ पंजीकृत कीजिए, प्रवेश और निकास द्वार चिह्नित कीजिए, लेआउट बनाइए, दरें तय कीजिए, और बुकिंग व सत्र संभालिए।', 'ಸೌಲಭ್ಯಗಳನ್ನು ನೋಂದಾಯಿಸಿ, ಪ್ರವೇಶ ಮತ್ತು ನಿರ್ಗಮನ ಗೇಟ್ ಗುರುತಿಸಿ, ವಿನ್ಯಾಸ ರಚಿಸಿ, ದರ ನಿಗದಿಪಡಿಸಿ, ಬುಕಿಂಗ್ ಮತ್ತು ಸೆಷನ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ.'],
    'Sized to your vehicle': ['आपके वाहन के हिसाब से', 'ನಿಮ್ಮ ವಾಹನಕ್ಕೆ ತಕ್ಕ ಗಾತ್ರ'], 'Tell us your car or bike model. We find its size automatically and only offer slots it fits, with EV, covered and accessible filters.': ['अपनी कार या बाइक का मॉडल बताइए। हम उसका आकार अपने आप पता लगाते हैं और केवल वही स्लॉट दिखाते हैं जिनमें वह आए – EV, ढके हुए और सुलभ फ़िल्टर के साथ।', 'ನಿಮ್ಮ ಕಾರು ಅಥವಾ ಬೈಕ್ ಮಾದರಿ ಹೇಳಿ. ನಾವು ಅದರ ಗಾತ್ರವನ್ನು ತಾನಾಗಿ ಕಂಡುಹಿಡಿದು ಹೊಂದುವ ಸ್ಲಾಟ್‌ಗಳನ್ನು ಮಾತ್ರ ತೋರಿಸುತ್ತೇವೆ – EV, ಮುಚ್ಚಿದ ಮತ್ತು ಸುಲಭ ಪ್ರವೇಶ ಫಿಲ್ಟರ್‌ಗಳೊಂದಿಗೆ.'],
    'Drive guide': ['ड्राइव गाइड', 'ಡ್ರೈವ್ ಗೈಡ್'], 'A mini map, a route line and voice prompts take you from the gate to your slot - and back out - in English, Hindi or Kannada.': ['मिनी मैप, रूट लाइन और आवाज़ वाले निर्देश आपको गेट से आपके स्लॉट तक – और वापस बाहर – ले जाते हैं, अंग्रेज़ी, हिंदी या कन्नड़ में।', 'ಮಿನಿ ನಕ್ಷೆ, ಮಾರ್ಗ ರೇಖೆ ಮತ್ತು ಧ್ವನಿ ಸೂಚನೆಗಳು ನಿಮ್ಮನ್ನು ಗೇಟ್‌ನಿಂದ ಸ್ಲಾಟ್‌ವರೆಗೆ – ಮತ್ತು ವಾಪಸ್ ಹೊರಗೆ – ಕರೆದೊಯ್ಯುತ್ತವೆ, ಇಂಗ್ಲಿಷ್, ಹಿಂದಿ ಅಥವಾ ಕನ್ನಡದಲ್ಲಿ.'],
    'Rush calendar & fair pricing': ['भीड़ कैलेंडर और उचित कीमत', 'ದಟ್ಟಣೆ ಕ್ಯಾಲೆಂಡರ್ ಮತ್ತು ನ್ಯಾಯಯುತ ಬೆಲೆ'], 'See busy days around festivals, sales and weekends, with prices that ease when it is quiet.': ['त्योहारों, सेल और सप्ताहांत के आसपास की व्यस्त तारीखें देखिए, और शांत समय में कम होती कीमतें।', 'ಹಬ್ಬ, ಸೇಲ್ ಮತ್ತು ವಾರಾಂತ್ಯಗಳ ಸುತ್ತಲಿನ ಜನದಟ್ಟಣೆಯ ದಿನಗಳನ್ನು ನೋಡಿ, ಶಾಂತ ಸಮಯದಲ್ಲಿ ಬೆಲೆ ಕಡಿಮೆಯಾಗುತ್ತದೆ.'],
    'Pay online, refunds, reviews': ['ऑनलाइन भुगतान, रिफ़ंड, समीक्षाएँ', 'ಆನ್‌ಲೈನ್ ಪಾವತಿ, ಮರುಪಾವತಿ, ವಿಮರ್ಶೆಗಳು'], 'Pay by UPI or card, get refunds under clear cancellation rules, rate facilities and report problems.': ['UPI या कार्ड से भुगतान कीजिए, स्पष्ट रद्दीकरण नियमों के तहत रिफ़ंड पाइए, सुविधाओं को रेट कीजिए और समस्याएँ बताइए।', 'UPI ಅಥವಾ ಕಾರ್ಡ್ ಮೂಲಕ ಪಾವತಿಸಿ, ಸ್ಪಷ್ಟ ರದ್ದತಿ ನಿಯಮಗಳ ಅಡಿಯಲ್ಲಿ ಮರುಪಾವತಿ ಪಡೆಯಿರಿ, ಸೌಲಭ್ಯಗಳಿಗೆ ರೇಟಿಂಗ್ ನೀಡಿ ಮತ್ತು ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ.'],
    'How it works': ['यह कैसे काम करता है', 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ'], 'Four steps from “where am I going?” to “I’m parked.”': ['“मैं कहाँ जा रहा हूँ?” से “मैंने पार्क कर दिया” तक चार कदम।', '“ನಾನು ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತಿದ್ದೇನೆ?” ಇಂದ “ನಾನು ಪಾರ್ಕ್ ಮಾಡಿದ್ದೇನೆ” ವರೆಗೆ ನಾಲ್ಕು ಹಂತಗಳು.'],
    'Type your destination and time window.': ['अपनी मंज़िल और समय लिखिए।', 'ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನ ಮತ್ತು ಸಮಯ ಬರೆಯಿರಿ.'], 'Compare': ['तुलना करें', 'ಹೋಲಿಸಿ'], 'Review ranked options with price, walk time and free spaces.': ['कीमत, पैदल समय और खाली जगहों के साथ क्रमबद्ध विकल्प देखिए।', 'ಬೆಲೆ, ನಡಿಗೆ ಸಮಯ ಮತ್ತು ಖಾಲಿ ಜಾಗಗಳೊಂದಿಗೆ ಶ್ರೇಣೀಕೃತ ಆಯ್ಕೆಗಳನ್ನು ನೋಡಿ.'],
    'Reserve': ['आरक्षित करें', 'ಕಾಯ್ದಿರಿಸಿ'], 'Select a slot on the layout and confirm with your vehicle number.': ['लेआउट पर स्लॉट चुनिए और अपने वाहन नंबर से पुष्टि कीजिए।', 'ವಿನ್ಯಾಸದಲ್ಲಿ ಸ್ಲಾಟ್ ಆರಿಸಿ ಮತ್ತು ನಿಮ್ಮ ವಾಹನ ಸಂಖ್ಯೆಯಿಂದ ದೃಢೀಕರಿಸಿ.'],
    'Park & go': ['पार्क करें और चलें', 'ಪಾರ್ಕ್ ಮಾಡಿ ಹೊರಡಿ'], 'Navigate, check in, and get a digital receipt on check-out.': ['रास्ता पाइए, चेक-इन कीजिए, और चेक-आउट पर डिजिटल रसीद पाइए।', 'ದಾರಿ ಹಿಡಿಯಿರಿ, ಚೆಕ್-ಇನ್ ಮಾಡಿ, ಚೆಕ್-ಔಟ್‌ನಲ್ಲಿ ಡಿಜಿಟಲ್ ರಸೀದಿ ಪಡೆಯಿರಿ.'],
    'Own or manage a parking ground?': ['क्या आपके पास पार्किंग की जगह है?', 'ನಿಮ್ಮ ಬಳಿ ಪಾರ್ಕಿಂಗ್ ಜಾಗ ಇದೆಯೇ?'], 'Register your facility, allocate spaces to Marga, and let the layout generator organise them digitally – with no new hardware.': ['अपनी सुविधा पंजीकृत कीजिए, मार्ग के लिए जगह तय कीजिए, और लेआउट जनरेटर को उन्हें डिजिटल रूप से व्यवस्थित करने दीजिए – बिना किसी नए हार्डवेयर के।', 'ನಿಮ್ಮ ಸೌಲಭ್ಯ ನೋಂದಾಯಿಸಿ, ಮಾರ್ಗಕ್ಕೆ ಜಾಗ ಹಂಚಿ, ಲೇಔಟ್ ಜನರೇಟರ್ ಅವನ್ನು ಡಿಜಿಟಲ್ ಆಗಿ ಜೋಡಿಸಲಿ – ಹೊಸ ಹಾರ್ಡ್‌ವೇರ್ ಇಲ್ಲದೆ.'],
    'Register as an operator': ['संचालक के रूप में पंजीकरण', 'ನಿರ್ವಾಹಕರಾಗಿ ನೋಂದಾಯಿಸಿ'],
    // ---- sign in ----
    'New here?': ['नए हैं?', 'ಹೊಸಬರೇ?'], 'Create a free account': ['मुफ़्त खाता बनाइए', 'ಉಚಿತ ಖಾತೆ ರಚಿಸಿ'], '- any email address works.': ['- कोई भी ईमेल पता चलेगा।', '- ಯಾವುದೇ ಇಮೇಲ್ ವಿಳಾಸ ಸಾಕು.'], 'Demo accounts:': ['डेमो खाते:', 'ಡೆಮೊ ಖಾತೆಗಳು:'],
    'I am a…': ['मैं हूँ…', 'ನಾನು…'], 'Driver – I want to find parking': ['ड्राइवर – मुझे पार्किंग चाहिए', 'ಚಾಲಕ – ನನಗೆ ಪಾರ್ಕಿಂಗ್ ಬೇಕು'], 'Operator – I manage parking space': ['संचालक – मैं पार्किंग जगह संभालता हूँ', 'ನಿರ್ವಾಹಕ – ನಾನು ಪಾರ್ಕಿಂಗ್ ಜಾಗ ನಿರ್ವಹಿಸುತ್ತೇನೆ'],
    'Password (min 6 characters)': ['पासवर्ड (कम से कम 6 अक्षर)', 'ಪಾಸ್‌ವರ್ಡ್ (ಕನಿಷ್ಠ 6 ಅಕ್ಷರ)'], 'Create account': ['खाता बनाइए', 'ಖಾತೆ ರಚಿಸಿ'],
    // ---- search ----
    'Destination': ['गंतव्य', 'ಗಮ್ಯಸ್ಥಾನ'], 'Search a mall, station, area or address…': ['मॉल, स्टेशन, इलाका या पता खोजिए…', 'ಮಾಲ್, ನಿಲ್ದಾಣ, ಪ್ರದೇಶ ಅಥವಾ ವಿಳಾಸ ಹುಡುಕಿ…'],
    'Type a place and pick it from the suggestions,': ['जगह लिखिए और सुझावों में से चुनिए,', 'ಸ್ಥಳ ಬರೆದು ಸಲಹೆಗಳಿಂದ ಆರಿಸಿ,'], 'click anywhere on the map': ['नक्शे पर कहीं भी क्लिक कीजिए', 'ನಕ್ಷೆಯಲ್ಲಿ ಎಲ್ಲಿಯಾದರೂ ಕ್ಲಿಕ್ ಮಾಡಿ'], ', or': [', या', ', ಅಥವಾ'], 'drag the ★ pin': ['★ पिन को खींचिए', '★ ಪಿನ್ ಎಳೆಯಿರಿ'], '. Use 📍 for your current location.': ['। अपनी वर्तमान लोकेशन के लिए 📍 दबाइए।', '. ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಳಕ್ಕಾಗಿ 📍 ಬಳಸಿ.'],
    'Search radius': ['खोज का दायरा', 'ಹುಡುಕಾಟ ವ್ಯಾಪ್ತಿ'], 'What matters most?': ['सबसे ज़रूरी क्या है?', 'ಹೆಚ್ಚು ಮುಖ್ಯವಾದುದು ಯಾವುದು?'], 'Balanced': ['संतुलित', 'ಸಮತೋಲಿತ'], 'Cheapest': ['सबसे सस्ता', 'ಅತಿ ಕಡಿಮೆ ಬೆಲೆ'], 'Closest to destination': ['गंतव्य के सबसे पास', 'ಗಮ್ಯಸ್ಥಾನಕ್ಕೆ ಹತ್ತಿರ'],
    'Slot features': ['स्लॉट की सुविधाएँ', 'ಸ್ಲಾಟ್ ಸೌಲಭ್ಯಗಳು'], '⚡ EV charging': ['⚡ EV चार्जिंग', '⚡ EV ಚಾರ್ಜಿಂಗ್'], '☂ Covered': ['☂ ढका हुआ', '☂ ಮುಚ್ಚಿದ'], '♿ Accessible': ['♿ सुलभ', '♿ ಸುಲಭ ಪ್ರವೇಶ'],
    'Best match': ['सबसे बेहतर', 'ಉತ್ತಮ ಆಯ್ಕೆ'], 'Full': ['भरा हुआ', 'ತುಂಬಿದೆ'], 'View slots & book': ['स्लॉट देखें और बुक करें', 'ಸ್ಲಾಟ್ ನೋಡಿ ಮತ್ತು ಬುಕ್ ಮಾಡಿ'], 'View layout': ['लेआउट देखें', 'ವಿನ್ಯಾಸ ನೋಡಿ'], 'Rush forecast': ['भीड़ का पूर्वानुमान', 'ದಟ್ಟಣೆ ಮುನ್ಸೂಚನೆ'],
    'Fully booked for this time': ['इस समय के लिए पूरी तरह बुक', 'ಈ ಸಮಯಕ್ಕೆ ಸಂಪೂರ್ಣ ಬುಕ್ ಆಗಿದೆ'], 'Other parking nearby': ['पास की अन्य पार्किंग', 'ಹತ್ತಿರದ ಇತರ ಪಾರ್ಕಿಂಗ್'], 'Not on MARGA yet': ['अभी MARGA पर नहीं', 'ಇನ್ನೂ MARGA ನಲ್ಲಿ ಇಲ್ಲ'], 'Directions': ['रास्ता', 'ದಾರಿ'],
    'Closest to your destination': ['आपकी मंज़िल के सबसे पास', 'ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನಕ್ಕೆ ಹತ್ತಿರ'], 'No verified parking in range': ['दायरे में कोई सत्यापित पार्किंग नहीं', 'ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಪರಿಶೀಲಿತ ಪಾರ್ಕಿಂಗ್ ಇಲ್ಲ'],
    // ---- facility ----
    '← Back to results': ['← परिणामों पर वापस', '← ಫಲಿತಾಂಶಗಳಿಗೆ ಹಿಂತಿರುಗಿ'], 'Update availability': ['उपलब्धता अपडेट करें', 'ಲಭ್ಯತೆ ನವೀಕರಿಸಿ'], 'Vehicle type': ['वाहन का प्रकार', 'ವಾಹನದ ಪ್ರಕಾರ'], 'Your vehicle (brand and model)': ['आपका वाहन (ब्रांड और मॉडल)', 'ನಿಮ್ಮ ವಾಹನ (ಬ್ರಾಂಡ್ ಮತ್ತು ಮಾದರಿ)'],
    'Type your car or bike. We find its size automatically, so you never enter measurements.': ['अपनी कार या बाइक लिखिए। हम उसका आकार अपने आप पता लगाते हैं, आपको नाप नहीं डालनी पड़ती।', 'ನಿಮ್ಮ ಕಾರು ಅಥವಾ ಬೈಕ್ ಬರೆಯಿರಿ. ನಾವು ಅದರ ಗಾತ್ರವನ್ನು ತಾನಾಗಿ ಕಂಡುಹಿಡಿಯುತ್ತೇವೆ, ಅಳತೆ ಬರೆಯಬೇಕಿಲ್ಲ.'],
    'Special needs': ['विशेष ज़रूरतें', 'ವಿಶೇಷ ಅಗತ್ಯಗಳು'], '⚡ My vehicle is electric': ['⚡ मेरा वाहन इलेक्ट्रिक है', '⚡ ನನ್ನ ವಾಹನ ಎಲೆಕ್ಟ್ರಿಕ್'], '♿ I hold an accessible-parking permit': ['♿ मेरे पास सुलभ-पार्किंग परमिट है', '♿ ನನ್ನ ಬಳಿ ಸುಲಭ-ಪ್ರವೇಶ ಪಾರ್ಕಿಂಗ್ ಪರವಾನಗಿ ಇದೆ'],
    'Show only slots with:': ['केवल इन सुविधाओं वाले स्लॉट दिखाएँ:', 'ಈ ಸೌಲಭ್ಯದ ಸ್ಲಾಟ್‌ಗಳನ್ನು ಮಾತ್ರ ತೋರಿಸಿ:'], 'Not available for you': ['आपके लिए उपलब्ध नहीं', 'ನಿಮಗೆ ಲಭ್ಯವಿಲ್ಲ'], 'Your selection / your booked slot': ['आपका चयन / आपका बुक किया स्लॉट', 'ನಿಮ್ಮ ಆಯ್ಕೆ / ನೀವು ಬುಕ್ ಮಾಡಿದ ಸ್ಲಾಟ್'],
    'EV charging': ['EV चार्जिंग', 'EV ಚಾರ್ಜಿಂಗ್'], 'Accessible': ['सुलभ', 'ಸುಲಭ ಪ್ರವೇಶ'], 'Expected rush': ['अपेक्षित भीड़', 'ನಿರೀಕ್ಷಿತ ದಟ್ಟಣೆ'], 'See the rush calendar & forecast': ['भीड़ कैलेंडर और पूर्वानुमान देखें', 'ದಟ್ಟಣೆ ಕ್ಯಾಲೆಂಡರ್ ಮತ್ತು ಮುನ್ಸೂಚನೆ ನೋಡಿ'], 'Ratings & reviews': ['रेटिंग और समीक्षाएँ', 'ರೇಟಿಂಗ್ ಮತ್ತು ವಿಮರ್ಶೆಗಳು'],
    'Your booking': ['आपकी बुकिंग', 'ನಿಮ್ಮ ಬುಕಿಂಗ್'], 'Tap an available slot on the layout.': ['लेआउट पर कोई उपलब्ध स्लॉट चुनिए।', 'ವಿನ್ಯಾಸದಲ್ಲಿ ಲಭ್ಯ ಸ್ಲಾಟ್ ಒತ್ತಿ.'], 'Vehicle registration number': ['वाहन पंजीकरण संख्या', 'ವಾಹನ ನೋಂದಣಿ ಸಂಖ್ಯೆ'],
    'Pay the booking fee now (refundable as per the cancellation rules)': ['बुकिंग शुल्क अभी चुकाएँ (रद्दीकरण नियमों के अनुसार रिफ़ंड योग्य)', 'ಬುಕಿಂಗ್ ಶುಲ್ಕವನ್ನು ಈಗ ಪಾವತಿಸಿ (ರದ್ದತಿ ನಿಯಮಗಳ ಪ್ರಕಾರ ಮರುಪಾವತಿಸಬಹುದು)'], 'Reserve this slot': ['यह स्लॉट आरक्षित करें', 'ಈ ಸ್ಲಾಟ್ ಕಾಯ್ದಿರಿಸಿ'],
    'Cancellation & refund rules': ['रद्दीकरण और रिफ़ंड नियम', 'ರದ್ದತಿ ಮತ್ತು ಮರುಪಾವತಿ ನಿಯಮಗಳು'], 'Fits comfortably': ['आराम से फिट', 'ಆರಾಮವಾಗಿ ಹೊಂದುತ್ತದೆ'], 'Tight fit': ['तंग फिट', 'ಬಿಗಿ ಹೊಂದಾಣಿಕೆ'], 'Open air': ['खुली हवा', 'ತೆರೆದ ಜಾಗ'], 'Covered': ['ढका हुआ', 'ಮುಚ್ಚಿದ'],
    'Booking confirmed 🎉': ['बुकिंग पक्की हुई 🎉', 'ಬುಕಿಂಗ್ ದೃಢಪಟ್ಟಿದೆ 🎉'], 'Your Parking ID': ['आपकी पार्किंग आईडी', 'ನಿಮ್ಮ ಪಾರ್ಕಿಂಗ್ ಐಡಿ'], 'Go to my bookings': ['मेरी बुकिंग पर जाइए', 'ನನ್ನ ಬುಕಿಂಗ್‌ಗಳಿಗೆ ಹೋಗಿ'], 'Parking ID': ['पार्किंग आईडी', 'ಪಾರ್ಕಿಂಗ್ ಐಡಿ'],
    'Quietest:': ['सबसे शांत:', 'ಅತಿ ಶಾಂತ:'], 'Busiest:': ['सबसे व्यस्त:', 'ಅತಿ ಹೆಚ್ಚು ಜನದಟ್ಟಣೆ:'], 'Quietest': ['सबसे शांत', 'ಅತಿ ಶಾಂತ'], 'Busiest': ['सबसे व्यस्त', 'ಅತಿ ಹೆಚ್ಚು ಜನದಟ್ಟಣೆ'], 'No reviews yet': ['अभी कोई समीक्षा नहीं', 'ಇನ್ನೂ ವಿಮರ್ಶೆಗಳಿಲ್ಲ'],
    // ---- dashboard ----
    'My dashboard': ['मेरा डैशबोर्ड', 'ನನ್ನ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್'], 'Manage your bookings, check in, and view receipts.': ['अपनी बुकिंग संभालिए, चेक-इन कीजिए और रसीदें देखिए।', 'ನಿಮ್ಮ ಬುಕಿಂಗ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ, ಚೆಕ್-ಇನ್ ಮಾಡಿ ಮತ್ತು ರಸೀದಿಗಳನ್ನು ನೋಡಿ.'], '+ Find parking': ['+ पार्किंग खोजें', '+ ಪಾರ್ಕಿಂಗ್ ಹುಡುಕಿ'],
    'Upcoming': ['आगामी', 'ಮುಂಬರುವ'], 'Parked now': ['अभी पार्क', 'ಈಗ ಪಾರ್ಕ್ ಆಗಿದೆ'], 'Completed': ['पूरी हुई', 'ಪೂರ್ಣಗೊಂಡ'], 'Total spent': ['कुल खर्च', 'ಒಟ್ಟು ಖರ್ಚು'], 'My bookings': ['मेरी बुकिंग', 'ನನ್ನ ಬುಕಿಂಗ್‌ಗಳು'], 'My vehicles': ['मेरे वाहन', 'ನನ್ನ ವಾಹನಗಳು'], 'My reports': ['मेरी रिपोर्ट', 'ನನ್ನ ವರದಿಗಳು'],
    'No bookings yet': ['अभी कोई बुकिंग नहीं', 'ಇನ್ನೂ ಬುಕಿಂಗ್‌ಗಳಿಲ್ಲ'], 'Check in': ['चेक-इन', 'ಚೆಕ್-ಇನ್'], 'Check out & pay': ['चेक-आउट और भुगतान', 'ಚೆಕ್-ಔಟ್ ಮತ್ತು ಪಾವತಿ'], 'QR pass': ['QR पास', 'QR ಪಾಸ್'], '★ Rate': ['★ रेट करें', '★ ರೇಟ್ ಮಾಡಿ'], 'Report a problem': ['समस्या बताएँ', 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ'],
    'Add a vehicle': ['वाहन जोड़ें', 'ವಾಹನ ಸೇರಿಸಿ'], 'Registration number': ['पंजीकरण संख्या', 'ನೋಂದಣಿ ಸಂಖ್ಯೆ'], 'Brand and model': ['ब्रांड और मॉडल', 'ಬ್ರಾಂಡ್ ಮತ್ತು ಮಾದರಿ'], 'Nickname (optional)': ['उपनाम (वैकल्पिक)', 'ಅಡ್ಡಹೆಸರು (ಐಚ್ಛಿಕ)'], '⚡ This is an electric vehicle': ['⚡ यह इलेक्ट्रिक वाहन है', '⚡ ಇದು ಎಲೆಕ್ಟ್ರಿಕ್ ವಾಹನ'], 'Add vehicle': ['वाहन जोड़ें', 'ವಾಹನ ಸೇರಿಸಿ'],
    'We read the brand and model and set your vehicle’s size automatically - you never need to enter measurements.': ['हम ब्रांड और मॉडल पढ़कर आपके वाहन का आकार अपने आप तय करते हैं - आपको नाप डालने की ज़रूरत नहीं।', 'ನಾವು ಬ್ರಾಂಡ್ ಮತ್ತು ಮಾದರಿ ಓದಿ ನಿಮ್ಮ ವಾಹನದ ಗಾತ್ರವನ್ನು ತಾನಾಗಿ ನಿರ್ಧರಿಸುತ್ತೇವೆ - ಅಳತೆ ಬರೆಯುವ ಅಗತ್ಯವಿಲ್ಲ.'], 'Size set automatically': ['आकार अपने आप तय', 'ಗಾತ್ರ ತಾನಾಗಿ ನಿರ್ಧಾರ'],
    'No vehicles saved yet.': ['अभी कोई वाहन सहेजा नहीं गया।', 'ಇನ್ನೂ ಯಾವುದೇ ವಾಹನ ಉಳಿಸಿಲ್ಲ.'], 'Send report': ['रिपोर्ट भेजें', 'ವರದಿ ಕಳುಹಿಸಿ'], 'Submit review': ['समीक्षा जमा करें', 'ವಿಮರ್ಶೆ ಸಲ್ಲಿಸಿ'], 'Reviewed ✓': ['समीक्षा दी ✓', 'ವಿಮರ್ಶೆ ನೀಡಲಾಗಿದೆ ✓'],
    // ---- drive guide ----
    '← My bookings': ['← मेरी बुकिंग', '← ನನ್ನ ಬುಕಿಂಗ್‌ಗಳು'], 'To my slot': ['मेरे स्लॉट तक', 'ನನ್ನ ಸ್ಲಾಟ್‌ಗೆ'], 'To the exit': ['निकास तक', 'ನಿರ್ಗಮನಕ್ಕೆ'], 'Mini map': ['मिनी मैप', 'ಮಿನಿ ನಕ್ಷೆ'], '⤢ Bigger map': ['⤢ बड़ा नक्शा', '⤢ ದೊಡ್ಡ ನಕ್ಷೆ'], '✕ Close': ['✕ बंद करें', '✕ ಮುಚ್ಚಿ'],
    'Your slot': ['आपका स्लॉट', 'ನಿಮ್ಮ ಸ್ಲಾಟ್'], 'You': ['आप', 'ನೀವು'], '— Route': ['— रास्ता', '— ಮಾರ್ಗ'], '▲ Entry': ['▲ प्रवेश', '▲ ಪ್ರವೇಶ'], '▼ Exit': ['▼ निकास', '▼ ನಿರ್ಗಮನ'], '▶ Start guidance': ['▶ मार्गदर्शन शुरू करें', '▶ ಮಾರ್ಗದರ್ಶನ ಆರಂಭಿಸಿ'],
    '⏸ Pause': ['⏸ रोकें', '⏸ ನಿಲ್ಲಿಸಿ'], '▶ Resume': ['▶ फिर शुरू करें', '▶ ಮುಂದುವರಿಸಿ'], '↺ Start again': ['↺ फिर से शुरू करें', '↺ ಮತ್ತೆ ಆರಂಭಿಸಿ'], '⏮ Back': ['⏮ पीछे', '⏮ ಹಿಂದೆ'], 'Next ⏭': ['अगला ⏭', 'ಮುಂದೆ ⏭'], '🔁 Repeat': ['🔁 दोहराएँ', '🔁 ಪುನರಾವರ್ತಿಸಿ'],
    '🔊 Voice': ['🔊 आवाज़', '🔊 ಧ್ವನಿ'], 'Speed': ['गति', 'ವೇಗ'], 'Slow': ['धीमी', 'ನಿಧಾನ'], 'Normal': ['सामान्य', 'ಸಾಮಾನ್ಯ'], 'Fast': ['तेज़', 'ವೇಗ'], '✅ I’ve parked – check me in': ['✅ मैंने पार्क कर दिया – चेक-इन करें', '✅ ನಾನು ಪಾರ್ಕ್ ಮಾಡಿದ್ದೇನೆ – ಚೆಕ್-ಇನ್ ಮಾಡಿ'],
    'Press Start': ['शुरू दबाइए', 'ಆರಂಭಿಸಿ ಒತ್ತಿ'], 'Show the way to the exit': ['निकास का रास्ता दिखाएँ', 'ನಿರ್ಗಮನದ ದಾರಿ ತೋರಿಸಿ'],
    // ---- rush page ----
    'Rush insights': ['भीड़ की जानकारी', 'ದಟ್ಟಣೆ ಮಾಹಿತಿ'], 'Find out when a parking facility is likely to be busy - around weekends, festivals, sales and paydays.': ['जानिए पार्किंग कब व्यस्त रहने की संभावना है - सप्ताहांत, त्योहार, सेल और वेतन के दिनों के आसपास।', 'ಪಾರ್ಕಿಂಗ್ ಯಾವಾಗ ಜನದಟ್ಟಣೆಯಿಂದ ಕೂಡಿರುತ್ತದೆ ಎಂದು ತಿಳಿಯಿರಿ - ವಾರಾಂತ್ಯ, ಹಬ್ಬ, ಸೇಲ್ ಮತ್ತು ಸಂಬಳದ ದಿನಗಳ ಸುತ್ತ.'],
    'Book parking here': ['यहाँ पार्किंग बुक करें', 'ಇಲ್ಲಿ ಪಾರ್ಕಿಂಗ್ ಬುಕ್ ಮಾಡಿ'], 'A typical week': ['एक सामान्य सप्ताह', 'ಒಂದು ಸಾಮಾನ್ಯ ವಾರ'], 'Coming up': ['आने वाले', 'ಮುಂಬರುವ'], 'How the forecast works': ['पूर्वानुमान कैसे काम करता है', 'ಮುನ್ಸೂಚನೆ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ'],
    '🎉 festival / holiday / sale': ['🎉 त्योहार / छुट्टी / सेल', '🎉 ಹಬ್ಬ / ರಜೆ / ಸೇಲ್'], 'Sun': ['रवि', 'ಭಾನು'], 'Mon': ['सोम', 'ಸೋಮ'], 'Tue': ['मंगल', 'ಮಂಗಳ'], 'Wed': ['बुध', 'ಬುಧ'], 'Thu': ['गुरु', 'ಗುರು'], 'Fri': ['शुक्र', 'ಶುಕ್ರ'], 'Sat': ['शनि', 'ಶನಿ'],
    // ---- operator / admin ----
    '+ Register facility': ['+ सुविधा पंजीकृत करें', '+ ಸೌಲಭ್ಯ ನೋಂದಾಯಿಸಿ'], 'Overview': ['अवलोकन', 'ಅವಲೋಕನ'], 'Layout': ['लेआउट', 'ವಿನ್ಯಾಸ'], 'Bookings & sessions': ['बुकिंग और सत्र', 'ಬುಕಿಂಗ್ ಮತ್ತು ಸೆಷನ್‌ಗಳು'], 'Driver reports': ['ड्राइवर रिपोर्ट', 'ಚಾಲಕರ ವರದಿಗಳು'],
    'Entry and exit gates': ['प्रवेश और निकास द्वार', 'ಪ್ರವೇಶ ಮತ್ತು ನಿರ್ಗಮನ ಗೇಟ್‌ಗಳು'], 'Save gates': ['द्वार सहेजें', 'ಗೇಟ್ ಉಳಿಸಿ'], 'Digital layout generator': ['डिजिटल लेआउट जनरेटर', 'ಡಿಜಿಟಲ್ ವಿನ್ಯಾಸ ಜನರೇಟರ್'], 'Generate layout': ['लेआउट बनाएँ', 'ವಿನ್ಯಾಸ ರಚಿಸಿ'], 'Publish layout': ['लेआउट प्रकाशित करें', 'ವಿನ್ಯಾಸ ಪ್ರಕಟಿಸಿ'],
    'Admin console': ['एडमिन कंसोल', 'ಅಡ್ಮಿನ್ ಕನ್ಸೋಲ್'], 'Facilities': ['सुविधाएँ', 'ಸೌಲಭ್ಯಗಳು'], 'Approve': ['स्वीकृत करें', 'ಅನುಮೋದಿಸಿ'], 'Reject': ['अस्वीकार करें', 'ತಿರಸ್ಕರಿಸಿ'],
  };
  const MONTHS = { January: ['जनवरी', 'ಜನವರಿ'], February: ['फ़रवरी', 'ಫೆಬ್ರವರಿ'], March: ['मार्च', 'ಮಾರ್ಚ್'], April: ['अप्रैल', 'ಏಪ್ರಿಲ್'], May: ['मई', 'ಮೇ'], June: ['जून', 'ಜೂನ್'], July: ['जुलाई', 'ಜುಲೈ'], August: ['अगस्त', 'ಆಗಸ್ಟ್'], September: ['सितंबर', 'ಸೆಪ್ಟೆಂಬರ್'], October: ['अक्टूबर', 'ಅಕ್ಟೋಬರ್'], November: ['नवंबर', 'ನವೆಂಬರ್'], December: ['दिसंबर', 'ಡಿಸೆಂಬರ್'] };
  const LVL = { Low: 0, Moderate: 1, High: 2, 'Very high': 3 }, LV = [['कम', 'ಕಡಿಮೆ'], ['मध्यम', 'ಮಧ್ಯಮ'], ['अधिक', 'ಹೆಚ್ಚು'], ['बहुत अधिक', 'ತುಂಬಾ ಹೆಚ್ಚು']];
  const RULES = [
    [/^Logout \((.+)\)$/, (m) => [`लॉगआउट (${m[1]})`, `ಲಾಗ್‌ಔಟ್ (${m[1]})`]],
    [/^Hello, (.+) 👋$/, (m) => [`नमस्ते, ${m[1]} 👋`, `ನಮಸ್ಕಾರ, ${m[1]} 👋`]],
    [/^Slot (\d+)$/, (m) => [`स्लॉट ${m[1]}`, `ಸ್ಲಾಟ್ ${m[1]}`]],
    [/^Expected rush: (Low|Moderate|High|Very high)$/, (m) => [`अपेक्षित भीड़: ${LV[LVL[m[1]]][0]}`, `ನಿರೀಕ್ಷಿತ ದಟ್ಟಣೆ: ${LV[LVL[m[1]]][1]}`]],
    [/^(Low|Moderate|High|Very high) at your time$/, (m) => [`आपके समय पर: ${LV[LVL[m[1]]][0]}`, `ನಿಮ್ಮ ಸಮಯದಲ್ಲಿ: ${LV[LVL[m[1]]][1]}`]],
    [/^Est\. (₹[\d,]+) for your stay$/, (m) => [`आपके ठहराव का अनुमान ${m[1]}`, `ನಿಮ್ಮ ವಾಸಕ್ಕೆ ಅಂದಾಜು ${m[1]}`]],
    [/^Pay (₹[\d,]+)$/, (m) => [`भुगतान करें ${m[1]}`, `ಪಾವತಿಸಿ ${m[1]}`]],
    [/^Pay booking fee (₹[\d,]+)$/, (m) => [`बुकिंग शुल्क चुकाएँ ${m[1]}`, `ಬುಕಿಂಗ್ ಶುಲ್ಕ ಪಾವತಿಸಿ ${m[1]}`]],
    [/^(\d+) m to go$/, (m) => [`${m[1]} मीटर बाकी`, `${m[1]} ಮೀ ಬಾಕಿ`]],
    [/^about (\d+):(\d+) left$/, (m) => [`लगभग ${m[1]}:${m[2]} बाकी`, `ಸುಮಾರು ${m[1]}:${m[2]} ಬಾಕಿ`]],
    [/^about (\d+) min$/, (m) => [`लगभग ${m[1]} मिनट`, `ಸುಮಾರು ${m[1]} ನಿಮಿಷ`]],
    [/^Open the drive guide to (.+)$/, (m) => [`${m[1]} तक ड्राइव गाइड खोलें`, `${m[1]} ವರೆಗೆ ಡ್ರೈವ್ ಗೈಡ್ ತೆರೆಯಿರಿ`]],
    [/^(\d+) of (\d+) compatible spaces free for your time$/, (m) => [`आपके समय के लिए ${m[2]} में से ${m[1]} उपयुक्त जगहें खाली`, `ನಿಮ್ಮ ಸಮಯಕ್ಕೆ ${m[2]} ರಲ್ಲಿ ${m[1]} ಹೊಂದುವ ಜಾಗಗಳು ಖಾಲಿ`]],
    [/^About (\d+) min walk \((\d+) m straight-line\)$/, (m) => [`लगभग ${m[1]} मिनट पैदल (सीधी दूरी ${m[2]} मीटर)`, `ಸುಮಾರು ${m[1]} ನಿಮಿಷ ನಡಿಗೆ (ನೇರ ದೂರ ${m[2]} ಮೀ)`]],
    [/^(January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})$/, (m) => [`${MONTHS[m[1]][0]} ${m[2]}`, `${MONTHS[m[1]][1]} ${m[2]}`]],
  ];

  let lang = 'en';
  try { lang = localStorage.getItem('marga_lang') || 'en'; } catch (e) {}
  if (!['en', 'hi', 'kn'].includes(lang)) lang = 'en';
  const nodes = new WeakMap(), attrs = new WeakMap();
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE|SVG|NOSCRIPT)$/;
  const skipEl = (el) => { for (let e = el; e; e = e.parentElement) if (SKIP.test(e.nodeName.toUpperCase())) return true; return false; };

  function tr(str) {
    if (lang === 'en') return str;
    const core = str.trim(); if (!core) return str;
    const i = lang === 'hi' ? 0 : 1, lead = str.slice(0, str.indexOf(core)), trail = str.slice(str.indexOf(core) + core.length);
    const hit = D[core]; if (hit) return lead + hit[i] + trail;
    for (const [re, fn] of RULES) { const m = core.match(re); if (m) return lead + fn(m)[i] + trail; }
    return str;
  }
  function doText(n) {
    if (!n.parentElement || skipEl(n.parentElement)) return;
    let r = nodes.get(n);
    if (!r) { if (lang === 'en') return; r = { en: n.nodeValue, shown: n.nodeValue }; nodes.set(n, r); }
    else if (n.nodeValue !== r.shown) r.en = n.nodeValue;          // the page changed it: treat as new English text
    const out = tr(r.en);
    if (out !== n.nodeValue) n.nodeValue = out;
    r.shown = n.nodeValue;
  }
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  function doAttrs(el) {
    if (skipEl(el)) return;
    for (const a of ATTRS) {
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      let rec = attrs.get(el); if (!rec) { rec = {}; attrs.set(el, rec); }
      let r = rec[a]; const cur = el.getAttribute(a);
      if (!r) { if (lang === 'en') continue; r = rec[a] = { en: cur, shown: cur }; } else if (cur !== r.shown) r.en = cur;
      const out = tr(r.en); if (out !== cur) el.setAttribute(a, out); r.shown = el.getAttribute(a);
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function set(l) {
    if (!['en', 'hi', 'kn'].includes(l)) return;
    lang = l; try { localStorage.setItem('marga_lang', l); } catch (e) {}
    document.documentElement.lang = l; walk(document.body);
    const sel = document.getElementById('langSel'); if (sel) sel.value = l;
    window.dispatchEvent(new Event('marga:lang'));
  }
  const obs = new MutationObserver((muts) => {
    if (lang === 'en') return;
    for (const m of muts) {
      if (m.type === 'childList') m.addedNodes.forEach((n) => walk(n));
      else if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
    }
  });
  window.MargaI18n = { get lang() { return lang; }, set, t: tr, dict: D };
  document.documentElement.lang = lang;
  const start = () => { walk(document.body); obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS }); const s = document.getElementById('langSel'); if (s) s.value = lang; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
