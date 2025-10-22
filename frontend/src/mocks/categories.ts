// src/mocks/categories.ts
// Тип совместим по форме с твоим интерфейсом Category из компонента
export type Category = { id: string; name: string };

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Accounting' },
  { id: 'cat-2', name: 'Advertising' },
  { id: 'cat-3', name: 'Call Center' },
  { id: 'cat-4', name: 'Customer Service' },
  { id: 'cat-5', name: 'Data Analysis' },
  { id: 'cat-6', name: 'Design' },
  { id: 'cat-7', name: 'E-Commerce' },
  { id: 'cat-8', name: 'Finance' },
  { id: 'cat-9', name: 'HR' },
  { id: 'cat-10', name: 'IT' },
  // ещё немного, чтобы было несколько страниц карусели
  { id: 'cat-11', name: 'Accounting' },
  { id: 'cat-12', name: 'Design' },
  { id: 'cat-13', name: 'E-Commerce' },
  { id: 'cat-14', name: 'Finance' },
  { id: 'cat-15', name: 'Customer Service' },
];
