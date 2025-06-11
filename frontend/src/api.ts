import axios from 'axios';

// Use the backend address directly (port 13371)
const api = axios.create({
  baseURL: 'http://192.168.178.249:13371',
  withCredentials: true,
});

export interface TierlistSummary {
  id: number;
  name: string;
  creator_id: number;
}

export interface Tier {
  id: number;
  tierlist_id: number;
  name: string;
  colour: string;
  position: number;
}

export interface Item {
  id: number;
  tierlist_id: number;
  tier_id: number | null;
  name: string;
  image_url: string | null;
}

export interface VoteResponse {
  status: string;
  item_id: number;
  tier_id: number;
  user_id: string;
}

export async function getCurrentUser() {
  try {
    const res = await api.get('/auth/me');
    return res.data;
  } catch {
    return null;
  }
}

export async function fetchTierlists(): Promise<TierlistSummary[]> {
  const res = await api.get('/tierlists');
  return res.data;
}

export async function fetchTierlistDetail(
  id: number
): Promise<{ id: number; name: string; creator_id: number; tiers: Tier[] }> {
  const res = await api.get(`/tierlists/${id}`);
  return res.data;
}

export async function fetchItems(id: number): Promise<Item[]> {
  const res = await api.get(`/tierlists/${id}/items`);
  return res.data;
}

export async function updateItemTier(itemId: number, tierId: number | null) {
  const res = await api.patch(`/items/${itemId}`, { tier_id: tierId });
  return res.data;
}

export async function castVote(itemId: number, tierId: number) {
  const res = await api.post(`/items/${itemId}/vote`, { tier_id: tierId });
  return res.data as VoteResponse;
}

export async function createTierlist(name: string, tiers: { name: string; colour: string }[]) {
  const res = await api.post('/tierlists', { name, tiers });
  return res.data;
}

export async function addItemToTierlist(tierlistId: number, formData: FormData) {
  const res = await api.post(`/tierlists/${tierlistId}/items`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
