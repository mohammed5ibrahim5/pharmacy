import type { Product } from '@/types';

/**
 * محرك فحص التداخلات والتعارضات الدوائية الإكلينيكي (Clinical Drug-Drug Interaction Checker)
 * مبني على معايير الصيدلة الإكلينيكية القياسية لحماية المرضى من الآثار الجانبية والتسمم الدوائي
 */

export type InteractionSeverity = 'danger' | 'warning' | 'caution';

export interface InteractionAlert {
  id: string;
  severity: InteractionSeverity;
  drugA: { id: string; name: string };
  drugB: { id: string; name: string };
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  recommendationAr: string;
  recommendationEn: string;
}

interface DrugPattern {
  group: string;
  regex: RegExp;
  labelAr: string;
  labelEn: string;
}

// أنماط التعرف على المجموعات الدوائية والمواد الفعالة الأكثر شيوعاً
const DRUG_GROUPS: DrugPattern[] = [
  // 1. أدوية تحتوي على باراسيتامول (مفردة أو مركبة)
  {
    group: 'paracetamol',
    regex: /paracetamol|acetaminophen|باراسيتامول|بانادول|panadol|سيتامول|cetamol|أدول|adol|كونجستال|congestal|كومتركس|comtrex|فلورست|flurest|وان تو ثري|123|كولد كونترول|cold control|كولداكت|coldact|نوفالدول|novaldol|بارامول|paramol|أنتيفلو|antiflu/i,
    labelAr: 'باراسيتامول',
    labelEn: 'Paracetamol',
  },
  // 2. مضادات الالتهاب غير الستيرويدية (NSAIDs)
  {
    group: 'nsaid',
    regex: /ibuprofen|إيبوبروفين|بروفين|brufen|ديكلوفيناك|diclofenac|فولتارين|voltaren|كاتافلام|cataflam|كيتوبروفين|ketoprofen|باي الكوفان|bi-alcofan|كيتوفان|ketofan|كيتولاك|ketolac|نابروكسين|naproxen|نابروسين|naprosyn|سيلكوكسيب|celebrex|سيليبريكس|ميلوكسيكام|meloxicam|موبيك|mobic|إندوميثاسين|indomethacin/i,
    labelAr: 'مسكن مضاد للالتهاب (NSAID)',
    labelEn: 'NSAID Painkiller',
  },
  // 3. مسيلات ومضادات التجلط والصفائح (Anticoagulants / Antiplatelets)
  {
    group: 'anticoagulant',
    regex: /aspirin|أسبرين|اسبرين|ريفو|rivo|أسبوسيد|aspocid|warfarin|وارفارين|ماريفان|marevan|clopidogrel|كلوبيدوجريل|بلافيكس|plavix|ريفاروكسابان|rivaroxaban|زاريلتو|xarelto|إليكويس|eliquis/i,
    labelAr: 'مسيل دم ومضاد تجلط',
    labelEn: 'Blood Thinner / Anticoagulant',
  },
  // 4. أدوية النترات لعلاج الذبحة الصدرية (Nitrates)
  {
    group: 'nitrate',
    regex: /nitroglycerin|نيتروجلسرين|نيتروماك|nitromak|إيزوسوربيد|isosorbide|مونوماك|monomak|إفوديل|effox|إم دي آي|ديلاتريند/i,
    labelAr: 'نترات لتوسيع الشرايين (الذبحة)',
    labelEn: 'Nitrate (Angina Medication)',
  },
  // 5. مقويات الدورة الدموية ومثبطات PDE5
  {
    group: 'pde5_inhibitor',
    regex: /sildenafil|سيلدينافيل|فياجرا|viagra|سيلدافا|erox|تادالافيل|tadalafil|سياليس|cialis|فايركتا|vardenafil|فاردينافيل|ليفيترا|levitra/i,
    labelAr: 'مثبط PDE5 (منشط للدورة الدموية)',
    labelEn: 'PDE5 Inhibitor',
  },
  // 6. مضادات الحموضة ومركبات الكالسيوم/الماغنسيوم
  {
    group: 'antacid_minerals',
    regex: /antacid|مضاد حموضة|مالوكس|maalox|جافيسكون|gaviscon|إبيكوغيل|epicogel|ريني|rennie|كالسيوم|calcium|أوستيوكير|osteocare|حديد|iron|فيروجلوبين|feroglobin|هيموجيت/i,
    labelAr: 'مضاد حموضة / مكمل كالسيوم أو حديد',
    labelEn: 'Antacid / Mineral Supplement',
  },
  // 7. المضادات الحيوية التي تتأثر بالمعادن (Tetracyclines / Fluoroquinolones)
  {
    group: 'chelating_antibiotic',
    regex: /ciprofloxacin|سيبروفلوكساسين|سيبرو|cipro|سيبروفار|ciprofar|doxycycline|دوكسيسيكلين|فيبرامايسين|vibramycin|تيتراسيكلين|tetracycline|ليفوفلوكساسين|levofloxacin|تاريفلوكس|تاريفيد|أفالوكس|avelox/i,
    labelAr: 'مضاد حيوي (يتفاعل مع المعادن)',
    labelEn: 'Antibiotic (Interacts with Minerals)',
  },
  // 8. هرمون الغدة الدرقية (Levothyroxine)
  {
    group: 'thyroid',
    regex: /levothyroxine|ليفوثيروكسين|إلتروكسين|eltroxin|يوثيروكس|euthyrox/i,
    labelAr: 'هرمون الغدة الدرقية (إلتروكسين)',
    labelEn: 'Levothyroxine (Thyroid Hormone)',
  },
  // 9. المهدئات ومضادات الحساسية المنومة (Sedatives / 1st Gen Antihistamines)
  {
    group: 'sedating_antihistamine',
    regex: /chlorpheniramine|كلورفينيرامين|دايفينهيدرامين|diphenhydramine|ترايميثوبنزاميد|ألارمين|allermin|بيلارامين|atarax|أتاراكس|هيدروكسيزين|hydroxyzine|فينيرجان|phenergan|دورميفال/i,
    labelAr: 'مضاد حساسية أو مهدئ يسبب النعاس',
    labelEn: 'Sedating Antihistamine / Relaxant',
  },
];

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u0652\u0640]/g, '');
}

/**
 * استخراج المجموعات الدوائية لمنتج معين
 */
export function identifyProductGroups(product: Product): string[] {
  const text = normalizeText(
    `${product.name} ${product.name_en || ''} ${product.description || ''} ${product.active_ingredient || ''}`
  );
  const found: string[] = [];
  for (const item of DRUG_GROUPS) {
    if (item.regex.test(text)) {
      found.push(item.group);
    }
  }
  return found;
}

/**
 * فحص التداخلات والتعارضات الدوائية بين قائمة المنتجات الموجودة في السلة
 */
export function checkCartInteractions(products: Product[]): InteractionAlert[] {
  if (!products || products.length < 2) return [];

  const alerts: InteractionAlert[] = [];
  const checkedPairs = new Set<string>();

  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const pA = products[i];
      const pB = products[j];
      const pairKey = [pA.id, pB.id].sort().join('___');
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      const groupsA = identifyProductGroups(pA);
      const groupsB = identifyProductGroups(pB);

      // 1. تعارض حرج جداً: نترات + مقويات الدورة الدموية (PDE5 Inhibitors + Nitrates)
      if (
        (groupsA.includes('nitrate') && groupsB.includes('pde5_inhibitor')) ||
        (groupsA.includes('pde5_inhibitor') && groupsB.includes('nitrate'))
      ) {
        alerts.push({
          id: `pde5_nitrate_${pairKey}`,
          severity: 'danger',
          drugA: { id: pA.id, name: pA.name },
          drugB: { id: pB.id, name: pB.name },
          titleAr: 'تعارض خطير جداً: هبوط حاد في ضغط الدم',
          titleEn: 'Severe Danger: Fatal Hypotension Risk',
          descriptionAr:
            'تناول أدوية النترات (علاج الذبحة الصدرية) مع مثبطات PDE5 يؤدي إلى انخفاض مفاجئ وشديد في ضغط الدم قد يهدد الحياة.',
          descriptionEn:
            'Combining Nitrates with PDE5 inhibitors causes severe and potentially fatal hypotension.',
          recommendationAr:
            'ممنوع تناول هذين الدوائين معاً إطلاقاً تحت أي ظرف. استشر طبيب القلب فوراً.',
          recommendationEn:
            'Do NOT take these medicines together under any circumstances. Consult a cardiologist immediately.',
        });
      }

      // 2. تعارض خطير: مسكنات NSAIDs + أدوية السيولة ومضادات التجلط
      if (
        (groupsA.includes('nsaid') && groupsB.includes('anticoagulant')) ||
        (groupsA.includes('anticoagulant') && groupsB.includes('nsaid'))
      ) {
        alerts.push({
          id: `nsaid_anticoagulant_${pairKey}`,
          severity: 'danger',
          drugA: { id: pA.id, name: pA.name },
          drugB: { id: pB.id, name: pB.name },
          titleAr: 'خطر حدوث نزيف وقرحة في المعدة',
          titleEn: 'High Bleeding Risk (Gastrointestinal Hemorrhage)',
          descriptionAr:
            'الجمع بين مسكنات الالتهاب وأدوية السيولة يضاعف احتمالية حدوث نزيف حاد وقرحة معدية وخلل بتجلط الدم.',
          descriptionEn:
            'Combining NSAIDs with blood thinners significantly increases the risk of severe gastric bleeding.',
          recommendationAr:
            'يُفضل استبدال المسكن بمستحضر باراسيتامول آمن، أو استشارة الطبيب لوصف حماية للمعدة (مثل أوميبرازول).',
          recommendationEn:
            'Prefer Paracetamol for pain relief or consult a physician for stomach protective cover.',
        });
      }

      // 3. تحذير هام: تكرار أدوية الباراسيتامول في دوائين مختلفين
      if (groupsA.includes('paracetamol') && groupsB.includes('paracetamol')) {
        alerts.push({
          id: `paracetamol_dup_${pairKey}`,
          severity: 'warning',
          drugA: { id: pA.id, name: pA.name },
          drugB: { id: pB.id, name: pB.name },
          titleAr: 'تنبيه: جرعة مضاعفة من الباراسيتامول (تسمم كبدي)',
          titleEn: 'Warning: Paracetamol Overdose Risk (Hepatotoxicity)',
          descriptionAr:
            `كلا المنتجين (${pA.name} و ${pB.name}) يحتويان على مادة الباراسيتامول. الجمع بينهما قد يتجاوز الحد الأقصى الآمن (4000 مجم يومياً للبالغين) ويسبب تلف الكبد.`,
          descriptionEn:
            'Both products contain Paracetamol. Taking both may exceed the maximum daily safety limit (4000mg) and harm the liver.',
          recommendationAr:
            'اختر أحد الدوائين فقط، أو احرص على عدم تناولهما في نفس الوقت لتفادي الجرعة الزائدة.',
          recommendationEn:
            'Use only one of these products, or ensure you do not exceed the recommended total daily dose.',
        });
      }

      // 4. تحذير هام: تكرار مسكنين من عائلة NSAIDs معاً
      if (groupsA.includes('nsaid') && groupsB.includes('nsaid')) {
        alerts.push({
          id: `nsaid_dup_${pairKey}`,
          severity: 'warning',
          drugA: { id: pA.id, name: pA.name },
          drugB: { id: pB.id, name: pB.name },
          titleAr: 'ازدواجية المسكنات (مضاعفة خطر قرحة المعدة والكلى)',
          titleEn: 'Duplicate NSAIDs (Increased Renal & Gastric Toxicity)',
          descriptionAr:
            `تناول مسكنين من نفس المجموعة (${pA.name} مع ${pB.name}) لا يعطي تسكيناً إضافياً وإنما يضاعف أضرار المعدة ووظائف الكلى.`,
          descriptionEn:
            'Taking multiple NSAIDs together does not provide extra pain relief and sharply increases kidney and stomach side effects.',
          recommendationAr:
            'اكتفِ بنوع مسكن واحد، وإذا كان الألم شديداً يمكنك استشارة الصيدلي للتبادل مع باراسيتامول.',
          recommendationEn:
            'Stick to a single NSAID or consult a pharmacist to alternate with Paracetamol if needed.',
        });
      }

      // 5. تنبيه توقيت: مضادات الحموضة/الكالسيوم/الحديد + المضادات الحيوية أو هرمون الغدة
      if (
        (groupsA.includes('antacid_minerals') && (groupsB.includes('chelating_antibiotic') || groupsB.includes('thyroid'))) ||
        ((groupsA.includes('chelating_antibiotic') || groupsA.includes('thyroid')) && groupsB.includes('antacid_minerals'))
      ) {
        alerts.push({
          id: `antacid_chelation_${pairKey}`,
          severity: 'caution',
          drugA: { id: pA.id, name: pA.name },
          drugB: { id: pB.id, name: pB.name },
          titleAr: 'تنبيه توقيت: منع امتصاص الدواء بسبب المعادن أو مضاد الحموضة',
          titleEn: 'Timing Caution: Drug Absorption Interference',
          descriptionAr:
            'مضادات الحموضة ومكملات الكالسيوم أو الحديد تلتصق بالمضاد الحيوي أو هرمون الغدة وتمنع الجسم من امتصاصه والاستفادة منه.',
          descriptionEn:
            'Antacids, Calcium, or Iron bind to this antibiotic/thyroid hormone and prevent effective absorption.',
          recommendationAr:
            'افصل بين تناول الدوائين بساعتين على الأقل (أو 4 ساعات لهرمون الغدة) لضمان الفاعلية الكاملة.',
          recommendationEn:
            'Separate doses by at least 2 hours (or 4 hours for thyroid medication) to maintain efficacy.',
        });
      }

      // 6. تنبيه نعاس: مهدئات ومضادات حساسية
      if (groupsA.includes('sedating_antihistamine') && groupsB.includes('sedating_antihistamine')) {
        alerts.push({
          id: `sedation_${pairKey}`,
          severity: 'caution',
          drugA: { id: pA.id, name: pA.name },
          drugB: { id: pB.id, name: pB.name },
          titleAr: 'تنبيه: زيادة النعاس والتأثير على التركيز والقيادة',
          titleEn: 'Caution: Enhanced Drowsiness & Impaired Alertness',
          descriptionAr:
            'تناول مستحضرين يسببان النعاس قد يؤدي إلى خمول شديد وانخفاض التركيز الحركي.',
          descriptionEn:
            'Combining sedating preparations causes severe drowsiness and impairs motor coordination.',
          recommendationAr:
            'تجنب قيادة السيارة أو تشغيل الآلات الثقيلة عند تناول هذه الأدوية معاً.',
          recommendationEn:
            'Avoid driving or operating machinery when taking these medications concurrently.',
        });
      }
    }
  }

  return alerts;
}
