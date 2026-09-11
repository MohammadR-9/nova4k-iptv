/**
 * Universal Arabic & Multilingual Search Helper for NOVA 4K ULTRA
 * 
 * Solves:
 * 1. Deep Arabic normalization (Alef variations أ/إ/آ/ا, Taa Marbuta ة/ه, Yaa/Alef Maqsura ي/ى, Tashkeel, Tatweel, Numbers)
 * 2. Arabic <-> English phonetics & synonyms mapping (e.g. بين -> bein, ام بي سي -> mbc, سبايدر -> spider)
 * 3. Token-based smart matching with filler word tolerance (فيلم, مسلسل, قناة)
 * 4. Multi-field search (title, plot, cast, director, genre, category, channel number)
 */

/**
 * Normalizes any text (Arabic, Latin, Numbers) into a clean, comparable format.
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return '';

  return String(text)
    // 1. Unicode Normalization
    .normalize('NFD')
    
    // 2. Remove Arabic diacritics / Tashkeel (Fatha, Damma, Kasra, Sukun, Shadda, Tanween, etc.)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    
    // 3. Remove Tatweel / Kashida (ـ)
    .replace(/\u0640/g, '')
    
    // 4. Normalize Arabic Alef variations (أ, إ, آ, ٱ, ٵ, ٲ) -> ا
    .replace(/[أإآٱٵٲ]/g, 'ا')
    
    // 5. Normalize Taa Marbuta (ة) -> ه
    .replace(/ة/g, 'ه')
    
    // 6. Normalize Yaa / Alef Maqsura (ى, ئ, ؽ, ؾ, ؿ) -> ي
    .replace(/[ىئ]/g, 'ي')
    
    // 7. Normalize Hamza on Waw (ؤ) -> و
    .replace(/ؤ/g, 'و')
    
    // 8. Convert Eastern Arabic numerals (٠-٩) and Persian numerals (۰-۹) to standard Latin digits (0-9)
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')

    // 9. Normalize Persian / Kurdish variants (گ, پ, چ, ژ, ک, ی) -> standard Arabic
    .replace(/ك|ک/g, 'ك')
    .replace(/ي|ی/g, 'ي')

    // 10. Replace punctuation and special symbols with spaces
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]|"'؟?،\\+]/g, ' ')

    // 11. Normalize spaces & lowercase
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Common Arabic <-> English brand, channel, and title synonyms
 */
const RAW_SYNONYMS: Record<string, string[]> = {
  // Sports Channels
  'بين': ['bein', 'bien'],
  'بيان': ['bein'],
  'سبورت': ['sport', 'sports'],
  'سبورتس': ['sports', 'sport'],
  'بين سبورت': ['bein sport', 'bein sports', 'bein'],
  'الكاس': ['kass', 'alkass', 'alkas'],
  'كاس': ['kass', 'alkass'],
  'ابو ظبي': ['ad sport', 'abu dhabi', 'adsport'],
  'ابوظبي': ['ad sport', 'abu dhabi', 'adsport'],
  'دبي': ['dubai'],
  'اون': ['on sport', 'ontime', 'on time', 'on'],
  'تايم': ['time', 'ontime'],
  'اون تايم': ['ontime', 'on time'],
  'السعودية': ['saudi', 'ssc', 'ksa'],
  'سعوديه': ['saudi', 'ssc', 'ksa'],
  'اس اس سي': ['ssc'],
  'رياضه': ['sport', 'sports'],
  'رياضة': ['sport', 'sports'],

  // Networks & Streaming
  'ام بي سي': ['mbc'],
  'امبيسي': ['mbc'],
  'او اس ان': ['osn'],
  'اوسن': ['osn'],
  'شاهد': ['shahid'],
  'نتفلكس': ['netflix'],
  'نتفليكس': ['netflix'],
  'ديزني': ['disney'],
  'ابل': ['apple'],
  'برايم': ['prime', 'amazon'],
  'امازون': ['amazon', 'prime'],
  'اتش بي او': ['hbo'],
  'هبو': ['hbo'],
  'روتانا': ['rotana'],
  'المجد': ['almajd', 'majd'],

  // Genres & Common Words
  'اكشن': ['action'],
  'دراما': ['drama'],
  'سينما': ['cinema', 'movies', 'movie'],
  'افلام': ['movies', 'movie', 'film', 'cinema'],
  'فيلم': ['movie', 'film'],
  'مسلسلات': ['series'],
  'مسلسل': ['series'],
  'كوميدي': ['comedy'],
  'كوميديا': ['comedy'],
  'رعب': ['horror'],
  'وثائقي': ['documentary', 'doc', 'geo', 'nat geo'],
  'وثائقيه': ['documentary', 'doc', 'geo', 'nat geo'],
  'ناشيونال': ['national', 'nat geo'],
  'جيوغرافيك': ['geographic'],
  'اطفال': ['kids', 'cartoon', 'animation', 'cn', 'disney'],
  'كرتون': ['cartoon', 'animation', 'kids', 'cn'],
  'سبيستون': ['spacetoon'],
  'اخبار': ['news'],
  'الجزيرة': ['al jazeera', 'aljazeera', 'jazeera'],
  'جزيرة': ['al jazeera', 'aljazeera', 'jazeera'],
  'العربية': ['alarabiya', 'al arabiya'],
  'عربية': ['alarabiya', 'al arabiya'],
  'الحدث': ['alhadath', 'al hadath'],
  'حدث': ['alhadath', 'al hadath'],
  'سكاي': ['sky'],
  'فوكس': ['fox'],
  'زي': ['zee'],
  'الوان': ['alwan', 'colors'],
  'ماكس': ['max'],
  'اكسترا': ['extra'],
  'بريميوم': ['premium'],

  // Famous Titles & Transliterations
  'سبايدرمان': ['spider', 'spiderman'],
  'سبايدر مان': ['spider man', 'spiderman', 'spider'],
  'سبايدر': ['spider'],
  'مان': ['man'],
  'باتمان': ['batman'],
  'بات مان': ['batman'],
  'سوبرمان': ['superman'],
  'سوبر مان': ['superman'],
  'افاتار': ['avatar'],
  'افنجرز': ['avengers'],
  'المنتقمون': ['avengers'],
  'مارفل': ['marvel'],
  'جون ويك': ['john wick'],
  'جون': ['john'],
  'ويك': ['wick'],
  'هاري بوتر': ['harry potter'],
  'هاري': ['harry'],
  'بوتر': ['potter'],
  'جوكر': ['joker'],
  'الجوكر': ['joker'],
  'اوبنهايمر': ['oppenheimer'],
  'اوبن هايمر': ['oppenheimer'],
  'فاست': ['fast'],
  'فيوريوس': ['furious'],
  'المحارب': ['gladiator'],
  'جلاديتور': ['gladiator'],
  'تايتانيك': ['titanic'],
  'تيتانيك': ['titanic'],
  'ماتريكس': ['matrix'],
  'المصفوفة': ['matrix'],
  'الهيبة': ['al hayba', 'alhayba'],
  'الحفرة': ['cukur'],
  'ارطغرل': ['ertugrul'],
  'عثمان': ['osman'],
  'المؤسس عثمان': ['kurulus osman', 'osman'],
  'صلاح الدين': ['salahaddin'],
  'رامز': ['ramez'],
  'باب الحارة': ['bab al hara', 'bab alhara'],
  'الكبير': ['el kabeer', 'al kabeer'],
  'جعفر العمدة': ['gaafar el omda', 'jaafar'],
  'الاختيار': ['el ekhteyar', 'al ikhtiyar']
};

// Pre-normalize all dictionary keys and values for instant O(1) matching
const NORMALIZED_SYNONYMS: Map<string, string[]> = new Map();
for (const [key, val] of Object.entries(RAW_SYNONYMS)) {
  const normKey = normalizeSearchText(key);
  const normVals = val.map(v => normalizeSearchText(v));
  if (!NORMALIZED_SYNONYMS.has(normKey)) {
    NORMALIZED_SYNONYMS.set(normKey, []);
  }
  NORMALIZED_SYNONYMS.get(normKey)!.push(...normVals);
}

/**
 * Common Arabic filler words that shouldn't block matching if the core title matches
 */
const FILLER_WORDS = new Set([
  'فيلم',
  'مسلسل',
  'قناة',
  'قناه',
  'برنامج',
  'الجزء',
  'جزء',
  'الموسم',
  'موسم',
  'مترجم',
  'مدبلج',
  'كامل',
  'حصري',
  'بث',
  'مباشر'
]);

/**
 * Extracts all search variations for a given word or phrase
 */
function getWordVariations(word: string): string[] {
  const norm = normalizeSearchText(word);
  if (!norm) return [];

  const variations = new Set<string>([norm]);

  // If word starts with 'ال' (Arabic definite article) and length > 3, add stripped version
  if (norm.startsWith('ال') && norm.length > 3) {
    variations.add(norm.slice(2));
  }

  // Check normalized synonym dictionary
  if (NORMALIZED_SYNONYMS.has(norm)) {
    NORMALIZED_SYNONYMS.get(norm)!.forEach(s => variations.add(s));
  }

  // Also check if any key in NORMALIZED_SYNONYMS matches with 'ال' stripped
  const stripped = norm.startsWith('ال') && norm.length > 3 ? norm.slice(2) : null;
  if (stripped && NORMALIZED_SYNONYMS.has(stripped)) {
    NORMALIZED_SYNONYMS.get(stripped)!.forEach(s => variations.add(s));
  }

  return Array.from(variations).filter(Boolean);
}

/**
 * Checks if a target text matches a search query using universal Arabic/Multilingual logic.
 * 
 * Supports:
 * - Direct normalized substring match
 * - Compact (whitespace-collapsed) match (e.g. "سبايدر مان" matches "سبايدرمان")
 * - Multi-token match (all meaningful words must appear)
 * - Transliteration / Synonyms match (e.g. "بين" matches "bein")
 */
export function matchesSearch(
  target: string | (string | null | undefined)[] | null | undefined,
  query: string
): boolean {
  if (!query || !query.trim()) return true;
  if (!target) return false;

  // Build unified normalized target string from string or array of fields
  let combinedTarget = '';
  if (Array.isArray(target)) {
    combinedTarget = target.filter(Boolean).join(' ');
  } else {
    combinedTarget = String(target);
  }

  const normTarget = normalizeSearchText(combinedTarget);
  const normQuery = normalizeSearchText(query);

  if (!normTarget || !normQuery) return false;

  // 1. Direct normalized substring match
  if (normTarget.includes(normQuery)) {
    return true;
  }

  // 2. Compact match (removes all spaces from both)
  const compactTarget = normTarget.replace(/\s+/g, '');
  const compactQuery = normQuery.replace(/\s+/g, '');
  if (compactTarget.includes(compactQuery)) {
    return true;
  }

  // 3. Token-based matching
  const queryTokens = normQuery.split(' ').filter(t => t.length > 0);
  if (queryTokens.length === 0) return true;

  // Check if there are meaningful (non-filler) tokens
  const nonFillerTokens = queryTokens.filter(t => !FILLER_WORDS.has(t));
  const tokensToCheck = nonFillerTokens.length > 0 ? nonFillerTokens : queryTokens;

  // Every token (or one of its synonyms/variations) must match the target
  const allTokensMatch = tokensToCheck.every(token => {
    const variations = getWordVariations(token);
    return variations.some(v => {
      if (normTarget.includes(v)) return true;
      const compactV = v.replace(/\s+/g, '');
      if (compactTarget.includes(compactV)) return true;
      return false;
    });
  });

  if (allTokensMatch) {
    return true;
  }

  // 4. Whole-phrase synonyms check
  if (NORMALIZED_SYNONYMS.has(normQuery)) {
    const phraseSynonyms = NORMALIZED_SYNONYMS.get(normQuery) || [];
    if (phraseSynonyms.some((syn: string) => normTarget.includes(normalizeSearchText(syn)))) {
      return true;
    }
  }

  return false;
}

/**
 * Universal item matcher: checks all relevant metadata fields of a movie, series, or channel.
 */
export function matchesItemMetadata(
  item: {
    name?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    category_id?: string;
    category_name?: string;
    epg_channel_id?: string | null;
    num?: number | string;
    [key: string]: any;
  },
  query: string
): boolean {
  if (!query || !query.trim()) return true;
  if (!item) return false;

  // Collect all searchable fields
  const fields = [
    item.name,
    item.plot,
    item.cast,
    item.director,
    item.genre,
    item.category_name,
    item.epg_channel_id,
    item.num !== undefined ? String(item.num) : undefined
  ];

  return matchesSearch(fields, query);
}
