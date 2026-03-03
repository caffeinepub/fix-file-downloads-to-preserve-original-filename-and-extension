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
    owner?: Principal;
    password?: string;
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
    clearAllPastes(): Promise<void>;
    clearLegacyIdMap(): Promise<void>;
    clearUserProfiles(): Promise<void>;
    createPaste(pasteChunks: Array<PasteChunk>, expirationType: string, password: string | null): Promise<string>;
    deleteExpiredPastes(): Promise<void>;
    deletePaste(pasteId: string): Promise<void>;
    editPaste(pasteId: string, newItems: Array<PasteChunk>): Promise<void>;
    extendExpiration(pasteId: string, newExpirationType: string, _password: string | null): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFileData(pasteId: string, password: string | null, index: bigint): Promise<FileChunk | null>;
    getFileMetadata(pasteId: string, password: string | null): Promise<Array<[string, string | null]>>;
    getPassword(pasteId: string): Promise<string | null>;
    getPaste(pasteId: string, password: string | null): Promise<Paste | null>;
    getPasteChunk(pasteId: string, password: string | null, index: bigint): Promise<PasteChunk | null>;
    getPasteChunksWithTypes(pasteId: string, password: string | null): Promise<Array<[PasteChunk, PasteChunkType]>>;
    getPasteHistory(): Promise<Array<[string, Paste]> | null>;
    getRemainingTime(pasteId: string): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isPasteOwner(pasteId: string): Promise<boolean>;
    listActivePastes(): Promise<Array<string>>;
    listMyPastes(): Promise<Array<string>>;
    saveCallerUserProfile(userProfile: UserProfile): Promise<void>;
    saveFile(blob: ExternalBlob, filename: string, contentType: string | null): Promise<FileChunk>;
    systemDefaultCheck(): Promise<void>;
    systemDefaultReset(): Promise<void>;
}
