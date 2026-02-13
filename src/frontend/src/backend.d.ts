import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface FileChunk {
    contentType?: string;
    data: ExternalBlob;
    filename: string;
}
export interface Paste {
    expirationTime: bigint;
    items: Array<PasteChunk>;
}
export interface UserProfile {
    name: string;
}
export type PasteChunk = {
    __kind__: "file";
    file: FileChunk;
} | {
    __kind__: "text";
    text: string;
};
export enum PasteChunkType {
    file = "file",
    text = "text"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createPaste(chunks: Array<PasteChunk>, expirationType: string): Promise<string>;
    deleteExpiredPastes(): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFileMetadata(pasteId: string): Promise<Array<[string, string | null]>>;
    getPaste(pasteId: string): Promise<Paste>;
    getPasteChunksWithTypes(pasteId: string): Promise<Array<[PasteChunk, PasteChunkType]>>;
    getRemainingTime(pasteId: string): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listActivePastes(): Promise<Array<string>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveFile(blob: ExternalBlob, filename: string, contentType: string | null): Promise<FileChunk>;
}
