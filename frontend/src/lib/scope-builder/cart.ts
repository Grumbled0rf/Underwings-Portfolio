export type CategoryId = 'offensive' | 'grc' | 'cloud';

export interface CartItem {
  id: string;
  category: CategoryId;
  answers: Record<string, unknown>;
  comments?: string;
  range: { low: number; high: number };
  summary: string;
}

export interface UniversalComments {
  worry?: string;
  deadline?: string;
  existing?: string;
  other?: string;
}

export interface CartState {
  items: CartItem[];
  universal: UniversalComments;
  founding_optin: boolean;
  updated_at: number;
  version: 1;
}

const STORAGE_KEY = 'uw_scope_cart_v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function loadCart(): CartState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as CartState;
    if (state.version !== 1) return null;
    if (Date.now() - state.updated_at > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function saveCart(state: CartState): void {
  if (typeof localStorage === 'undefined') return;
  state.updated_at = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function emptyCart(): CartState {
  return { items: [], universal: {}, founding_optin: false, updated_at: Date.now(), version: 1 };
}

export function clearCart(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function addItem(state: CartState, item: Omit<CartItem, 'id'>): CartState {
  return { ...state, items: [...state.items, { ...item, id: crypto.randomUUID() }] };
}

export function removeItem(state: CartState, id: string): CartState {
  return { ...state, items: state.items.filter((i) => i.id !== id) };
}

export function updateItem(state: CartState, id: string, patch: Partial<CartItem>): CartState {
  return { ...state, items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) };
}
