/**
 * SEO & Schema.org Structured Data Helper
 * يوفر هياكل البيانات المنظمة (JSON-LD) لتحسين ظهور الصيدليات والأدوية في محركات بحث Google
 */

export interface PharmacySchemaProps {
  id: string;
  name: string;
  nameEn?: string | null;
  address?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ProductSchemaProps {
  id: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  category?: string | null;
  pharmacyName?: string | null;
}

export function generatePharmacySchema(props: PharmacySchemaProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    '@id': `https://saydaliti.app/pharmacy/${props.id}`,
    name: props.name,
    alternateName: props.nameEn || undefined,
    image: props.imageUrl || undefined,
    telephone: props.phone || undefined,
    address: props.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: props.address,
          addressCountry: 'EG',
        }
      : undefined,
    geo:
      props.latitude && props.longitude
        ? {
            '@type': 'GeoCoordinates',
            latitude: props.latitude,
            longitude: props.longitude,
          }
        : undefined,
    aggregateRating:
      props.rating && props.rating > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: props.rating,
            reviewCount: props.reviewsCount || 1,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };
}

export function generateProductSchema(props: ProductSchemaProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalProduct',
    name: props.name,
    alternateName: props.nameEn || undefined,
    description: props.description || undefined,
    image: props.imageUrl || undefined,
    category: props.category || 'Medication',
    offers: props.price
      ? {
          '@type': 'Offer',
          price: props.price,
          priceCurrency: 'EGP',
          availability: 'https://schema.org/InStock',
          seller: props.pharmacyName
            ? {
                '@type': 'Pharmacy',
                name: props.pharmacyName,
              }
            : undefined,
        }
      : undefined,
  };
}

export function generateFaqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };
}

export function generateArticleSchema(props: {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  keywords: string[];
  updatedAt: string;
  author?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: props.title,
    description: props.excerpt,
    articleSection: props.category,
    keywords: props.keywords.join(', '),
    dateModified: props.updatedAt,
    author: {
      '@type': 'Organization',
      name: props.author || 'صيدليتي',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://saydaliti.app/health/${props.slug}`,
    },
  };
}

/**
 * دالة لحقن الـ JSON-LD في رأس الصفحة للـ SEO
 */
export function setPageSchema(id: string, schemaObj: object) {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaObj);
}

export function removePageSchema(id: string) {
  const script = document.getElementById(id);
  if (script) {
    script.remove();
  }
}
