import type { AspectRatio, VideoStatus } from "./values";

export interface CreateVideoInput {
  externalId: string;
  idempotencyKey: string;
  title: string;
  script: string;
  durationSeconds: 5 | 10 | 15;
  aspectRatio: AspectRatio;
  language: string;
  avatarId: string;
  voiceId: string;
  imageUrls: string[];
}

export interface CreateVideoResult {
  providerJobId: string;
  providerVideoId?: string;
  status: VideoStatus;
  raw?: unknown;
}

export interface VideoStatusResult {
  providerJobId: string;
  providerVideoId?: string;
  status: VideoStatus;
  progress: number;
  errorCode?: string;
  errorMessage?: string;
  raw?: unknown;
}

export interface ListVideosInput {
  cursor?: string;
  limit?: number;
}

export interface VideoListItem {
  providerVideoId: string;
  name: string;
  status: VideoStatus;
  createdAt: string;
}

export interface ListVideosResult {
  items: VideoListItem[];
  nextCursor?: string;
}

export interface VideoDetailResult {
  providerVideoId: string;
  status: VideoStatus;
  name: string;
  playbackUrl?: string;
  downloadUrl?: string;
  durationSeconds?: number;
  fileSize?: number;
  expiresAt?: string;
}

export interface VideoProvider {
  createVideo(input: CreateVideoInput): Promise<CreateVideoResult>;
  getVideoStatus(providerJobId: string): Promise<VideoStatusResult>;
  listGeneratedVideos(input?: ListVideosInput): Promise<ListVideosResult>;
  getVideoDetail?(providerVideoId: string): Promise<VideoDetailResult>;
  cancelVideo?(providerJobId: string): Promise<void>;
}

