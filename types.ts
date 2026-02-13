
export interface Hotspot {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  label: string;
  description: string;
  audioData?: string; // Base64 PCM data
  isLoading?: boolean;
}

export interface Project {
  id: string;
  name: string;
  image: string; // Base64 image
  hotspots: Hotspot[];
  createdAt: number;
}

export enum AppMode {
  HOME = 'home',
  EDITOR = 'editor',
  PLAYER = 'player'
}
