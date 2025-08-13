// src/constants/categoryIcons.ts
import { IconType } from 'react-icons';
import {
  FaCalculator, FaBullhorn, FaHeadset, FaUserTie, FaChartBar, FaPalette,
  FaShoppingCart, FaMoneyBill, FaUsers, FaNetworkWired, FaLanguage, FaGavel,
  FaChartLine, FaBuilding, FaUsersCog, FaBriefcase, FaTasks, FaHandshake,
  FaCode, FaChalkboardTeacher, FaCalendarCheck, FaLaptopCode, FaTools, FaPen
} from 'react-icons/fa';

// 1) Иконки по "стабильным" slug-ам
export const categoryIconBySlug: Record<string, IconType> = {
  'accounting': FaCalculator,
  'advertising': FaBullhorn,
  'call-center': FaHeadset,
  'customer-service-admin-support': FaUserTie,
  'data-analysis': FaChartBar,
  'design': FaPalette,
  'e-commerce': FaShoppingCart,
  'finance-management': FaMoneyBill,
  'hr-recruiting': FaUsers,
  'it-networking': FaNetworkWired,
  'language-services': FaLanguage,
  'legal': FaGavel,
  'marketing-sales': FaChartLine,
  'office-and-admin': FaBuilding,
  'online-community-management': FaUsersCog,
  'professional-services': FaBriefcase,
  'project-coordination': FaTasks,
  'sales': FaHandshake,
  'software-and-mobile-development': FaCode,
  'training-education': FaChalkboardTeacher,
  'virtual-event-planning': FaCalendarCheck,
  'web-development': FaLaptopCode,
  'website-builder': FaTools,
  'writing': FaPen,
};

// 2) Алиасы (варианты имен, которые часто приходят с бэка)
export const categorySlugAliases: Record<string, string> = {
  'accounting-finance': 'accounting',
  'finance-accounting': 'accounting',
  'human-resources': 'hr-recruiting',
  'hr-and-recruiting': 'hr-recruiting',
  'it-support': 'it-networking',
  'networking': 'it-networking',
  'customer-service': 'customer-service-admin-support',
  'admin-support': 'office-and-admin',
  'sales-and-marketing': 'marketing-sales',
  'marketing': 'marketing-sales',
  'sales-marketing': 'marketing-sales',
  'software-development': 'software-and-mobile-development',
  'mobile-development': 'software-and-mobile-development',
  'data-science': 'data-analysis',
  'ecommerce': 'e-commerce',
  'web-design': 'web-development',
  'graphic-design': 'design',
  'training': 'training-education',
  'education': 'training-education',
};

// 3) Нормализация имени в slug
export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-') // Unicode-friendly
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

// 4) Функция выбора иконки
export const getCategoryIcon = (rawName: string) => {
  const slug = slugify(rawName);
  const normalized = categorySlugAliases[slug] || slug;
  return categoryIconBySlug[normalized] || FaBriefcase;
};
