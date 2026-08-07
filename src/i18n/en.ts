import { en_account } from './parts/en_account';
import { en_header } from './parts/en_header';
import { en_home } from './parts/en_home';
import { en_modals } from './parts/en_modals';
import { en_order } from './parts/en_order';
import { en_pages } from './parts/en_pages';
import { en_product } from './parts/en_product';

export const en: Record<string, string> = {
  ...en_account,
  ...en_header,
  ...en_home,
  ...en_modals,
  ...en_order,
  ...en_pages,
  ...en_product,
};
