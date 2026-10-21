import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.print = vi.fn();
  window.location.hash = '';
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
