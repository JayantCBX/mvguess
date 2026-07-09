import type { Category, Difficulty, LifeWord, RoomStatus } from "./game";
import type { HintMode, HintSettings } from "./hints";

export interface RoomRow {
  id: string;
  code: string;
  host_player_id: string | null;
  status: RoomStatus;
  category: Category;
  difficulty: Difficulty;
  life_word: LifeWord;
  life_remaining: number;
  current_turn_player_id: string | null;
  masked_movie: string | null;
  guessed_letters: string[];
  wrong_letters: string[];
  settings: Record<string, unknown>;
  hint_mode: HintMode | null;
  hint_positions: number[];
  hint_letters: string[];
  hint_settings: HintSettings | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  name: string;
  score: number;
  is_host: boolean;
  is_online: boolean;
  joined_at: string;
  last_seen_at: string;
}
