interface AreaLocation {
  latitude: number;
  longitude: number;
}

const AREA_LOCATIONS: Record<string, AreaLocation> = {
  'القاهرة': { latitude: 30.0444, longitude: 31.2357 },
  'المعادي': { latitude: 29.9604, longitude: 31.25 },
  'مدينة نصر': { latitude: 30.0495, longitude: 31.3302 },
  'التجمع الخامس': { latitude: 30.0105, longitude: 31.4346 },
  'مصر الجديدة': { latitude: 30.0933, longitude: 31.3242 },
  'الزمالك': { latitude: 30.0611, longitude: 31.22 },
  'الشروق': { latitude: 30.1437, longitude: 31.6403 },
  'الرحاب': { latitude: 30.0699, longitude: 31.5715 },

  'الجيزة': { latitude: 29.987, longitude: 31.2118 },
  'الدقي': { latitude: 30.0409, longitude: 31.2095 },
  'المهندسين': { latitude: 30.0608, longitude: 31.2128 },
  'الشيخ زايد': { latitude: 30.0394, longitude: 30.998 },
  '٦ أكتوبر': { latitude: 29.9349, longitude: 30.9432 },
  '6 أكتوبر': { latitude: 29.9349, longitude: 30.9432 },
  'الهرم': { latitude: 29.987, longitude: 31.2078 },
  'فيصل': { latitude: 29.9828, longitude: 31.22 },

  'الإسكندرية': { latitude: 31.2001, longitude: 29.9187 },
  'سموحة': { latitude: 31.2018, longitude: 29.9532 },
  'سيدي جابر': { latitude: 31.2175, longitude: 29.9342 },
  'المنتزه': { latitude: 31.281, longitude: 30.0159 },
  'ستانلي': { latitude: 31.2358, longitude: 29.9442 },
  'جليم': { latitude: 31.2395, longitude: 29.9532 },
  'ميامي': { latitude: 31.2637, longitude: 29.9764 },

  'الدقهلية': { latitude: 31.0385, longitude: 31.3785 },
  'المنصورة': { latitude: 31.0409, longitude: 31.3785 },
  'طلخا': { latitude: 31.0542, longitude: 31.3788 },
  'ميت غمر': { latitude: 30.7163, longitude: 31.2593 },

  'الغربية': { latitude: 30.7865, longitude: 31 },
  'طنطا': { latitude: 30.7865, longitude: 31 },
  'المحلة الكبرى': { latitude: 30.9706, longitude: 31.1666 },

  'القليوبية': { latitude: 30.1267, longitude: 31.2425 },
  'بنها': { latitude: 30.4633, longitude: 31.186 },
  'شبرا الخيمة': { latitude: 30.1267, longitude: 31.2425 },

  'الشرقية': { latitude: 30.5842, longitude: 31.5027 },
  'الزقازيق': { latitude: 30.5842, longitude: 31.5027 },
  'العاشر من رمضان': { latitude: 30.3036, longitude: 31.7266 },

  'أسيوط': { latitude: 27.1783, longitude: 31.1859 },
  'مدينة أسيوط': { latitude: 27.1783, longitude: 31.1859 },
  'أبنوب': { latitude: 27.2667, longitude: 31.15 },
};

export function findAreaLocation(locationName: string): AreaLocation | null {
  if (!locationName) return null;
  const keys = Object.keys(AREA_LOCATIONS);
  // Prefer the longest matching area name for better precision
  const sortedKeys = [...keys].sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (locationName.includes(key)) {
      return AREA_LOCATIONS[key];
    }
  }
  return null;
}
