import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'favorites:teams';

export async function getFavoriteTeamIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function setFavoriteTeamIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export async function addFavoriteTeam(teamId: string): Promise<string[]> {
  const current = await getFavoriteTeamIds();
  if (current.includes(teamId)) return current;
  const next = [...current, teamId];
  await setFavoriteTeamIds(next);
  return next;
}

export async function removeFavoriteTeam(teamId: string): Promise<string[]> {
  const current = await getFavoriteTeamIds();
  const next = current.filter((id) => id !== teamId);
  await setFavoriteTeamIds(next);
  return next;
}
