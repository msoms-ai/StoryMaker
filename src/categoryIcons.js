import {
  Compass, Wand2, Moon, Rocket, Search, GraduationCap, Heart, Landmark, BookOpen,
  Sparkles, Smile, Trees, Palette, Trophy, Shield, Zap, Sun, Flame, Music, Globe,
  Cat, Dog, Ghost, Feather, Star, Sword, MapPin, Footprints, Baby, Lightbulb,
  CloudRain, Coffee, Camera, Crown
} from 'lucide-react';

export const CATEGORY_ICON_MAP = {
  Compass,
  Wand2,
  Moon,
  Rocket,
  Search,
  GraduationCap,
  Heart,
  Landmark,
  BookOpen,
  Sparkles,
  Smile,
  Trees,
  Palette,
  Trophy,
  Shield,
  Zap,
  Sun,
  Flame,
  Music,
  Globe,
  Cat,
  Dog,
  Ghost,
  Feather,
  Star,
  Sword,
  MapPin,
  Footprints,
  Baby,
  Lightbulb,
  CloudRain,
  Coffee,
  Camera,
  Crown
};

export const AVAILABLE_CATEGORY_ICONS = [
  { id: 'BookOpen', label: { ar: 'كتاب / عام', en: 'Book / General' } },
  { id: 'Compass', label: { ar: 'بوصلة / مغامرة', en: 'Compass / Adventure' } },
  { id: 'Wand2', label: { ar: 'عصا سحرية / خيال', en: 'Magic Wand / Fantasy' } },
  { id: 'Moon', label: { ar: 'هلال / قبل النوم', en: 'Moon / Bedtime' } },
  { id: 'Rocket', label: { ar: 'صاروخ / فضاء وعلمي', en: 'Rocket / Space & Sci-Fi' } },
  { id: 'Search', label: { ar: 'عدسة / غموض وتحري', en: 'Search / Mystery' } },
  { id: 'GraduationCap', label: { ar: 'قبعة تخرج / تعليمي', en: 'Cap / Education' } },
  { id: 'Heart', label: { ar: 'قلب / أخلاقي وعائلي', en: 'Heart / Fables & Morals' } },
  { id: 'Landmark', label: { ar: 'معلم / تاريخ وتراث', en: 'Landmark / History' } },
  { id: 'Sparkles', label: { ar: 'بريق / سحر وأساطير', en: 'Sparkles / Magic' } },
  { id: 'Trees', label: { ar: 'أشجار / طبيعة وغابات', en: 'Trees / Nature' } },
  { id: 'Cat', label: { ar: 'قطة / حيوانات أليفة', en: 'Cat / Animals' } },
  { id: 'Dog', label: { ar: 'كلب / وفاء وحيوانات', en: 'Dog / Animals' } },
  { id: 'Smile', label: { ar: 'ابتسامة / مرح وضحك', en: 'Smile / Comedy & Fun' } },
  { id: 'Palette', label: { ar: 'لوحة ألوان / فن ورسم', en: 'Palette / Art & Craft' } },
  { id: 'Trophy', label: { ar: 'كأس / رياضة وبطولة', en: 'Trophy / Sports' } },
  { id: 'Shield', label: { ar: 'درع / أبطال وشجاعة', en: 'Shield / Heroes' } },
  { id: 'Sword', label: { ar: 'سيف / فروسية ومعارك', en: 'Sword / Knights' } },
  { id: 'Crown', label: { ar: 'تاج / ملوك وأميرات', en: 'Crown / Royalty' } },
  { id: 'Music', label: { ar: 'موسيقى / أغاني وألحان', en: 'Music / Songs' } },
  { id: 'Globe', label: { ar: 'كرة أرضية / بلدان وثقافات', en: 'Globe / Cultures' } },
  { id: 'Star', label: { ar: 'نجمة / أحلام وأمنيات', en: 'Star / Dreams' } },
  { id: 'Ghost', label: { ar: 'شبح / تشويق وإثارة', en: 'Ghost / Spooky' } },
  { id: 'Baby', label: { ar: 'طفل / للرضع والأطفال', en: 'Baby / Toddlers' } },
  { id: 'Lightbulb', label: { ar: 'مصباح / ذكاء وابتكار', en: 'Lightbulb / Ideas' } }
];

export const CATEGORY_COLORS = [
  'bg-indigo-600 text-white',
  'bg-amber-500 text-white',
  'bg-purple-600 text-white',
  'bg-blue-600 text-white',
  'bg-cyan-600 text-white',
  'bg-emerald-600 text-white',
  'bg-rose-600 text-white',
  'bg-yellow-700 text-white',
  'bg-orange-600 text-white',
  'bg-teal-600 text-white',
  'bg-fuchsia-600 text-white'
];

export function suggestCategoryIcon(nameAr = '', nameEn = '') {
  const text = (nameAr + ' ' + nameEn).toLowerCase();

  if (/(فضاء|صاروخ|كواكب|نجوم|علمي|scifi|sci-fi|space|rocket|planet|galaxy|alien)/i.test(text)) return 'Rocket';
  if (/(سحر|خيال|جني|أسطورة|ساحر|fantasy|magic|wizard|fairy|wand)/i.test(text)) return 'Wand2';
  if (/(نوم|هلال|قمر|ليل|أحلام|bedtime|sleep|night|moon|dream)/i.test(text)) return 'Moon';
  if (/(غموض|تحري|محقق|لغز|بحث|سر|mystery|detective|investigation|search|secret)/i.test(text)) return 'Search';
  if (/(تعليم|مدرسة|دراسة|معلم|طالب|علوم|education|school|learn|teacher|study|science)/i.test(text)) return 'GraduationCap';
  if (/(أخلاق|قيم|حب|عائلة|أسرة|صداقة|حكايات|fable|moral|heart|love|family|friend)/i.test(text)) return 'Heart';
  if (/(تاريخ|تراث|أجداد|قديم|حضارة|historical|history|heritage|ancient|monument)/i.test(text)) return 'Landmark';
  if (/(مغامرة|رحلة|استكشاف|سفر|طريق|adventure|explore|journey|travel|quest)/i.test(text)) return 'Compass';
  if (/(حيوان|قط|كلب|أليف|طيور|animal|pet|cat|dog|bird|creature)/i.test(text)) {
    if (/(كلب|dog)/i.test(text)) return 'Dog';
    return 'Cat';
  }
  if (/(طبيعة|غابة|شجر|حديقة|زهور|بيئة|nature|forest|tree|garden|jungle)/i.test(text)) return 'Trees';
  if (/(ضحك|مرح|فكاهة|نكتة|ابتسامة|كوميديا|funny|comedy|humor|laugh|joke|smile)/i.test(text)) return 'Smile';
  if (/(رسم|فن|ألوان|إبداع|art|draw|color|paint|palette)/i.test(text)) return 'Palette';
  if (/(رياضة|كأس|بطولة|فوز|سباق|كرة|sport|champion|trophy|race|win)/i.test(text)) return 'Trophy';
  if (/(سيف|فارس|معركة|شجاعة|knight|sword|warrior|battle|brave)/i.test(text)) return 'Sword';
  if (/(درع|أبطال|بطل|حماية|shield|hero|superhero|protect)/i.test(text)) return 'Shield';
  if (/(ملك|أمير|أميرة|تاج|قصر|royal|king|queen|prince|princess|crown)/i.test(text)) return 'Crown';
  if (/(موسيقى|أغنية|لحن|عزف|أنشودة|music|song|melody|sound)/i.test(text)) return 'Music';
  if (/(عالم|ثقافة|دول|شعوب|بلدان|world|global|globe|culture|country)/i.test(text)) return 'Globe';
  if (/(طفل|أطفال|رضيع|صغار|baby|toddler|kid|child)/i.test(text)) return 'Baby';
  if (/(فكرة|ذكاء|ابتكار|عقل|اختراع|idea|brain|smart|invent|lightbulb)/i.test(text)) return 'Lightbulb';

  return 'BookOpen';
}

export function getCategoryIconComponent(iconName) {
  return CATEGORY_ICON_MAP[iconName] || BookOpen;
}
