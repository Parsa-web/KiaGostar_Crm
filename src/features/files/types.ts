import type { ResourceScope } from '../../security'
export interface FileAttachment { id: string; entityType: string; entityId: string; uploadedBy: string; originalName: string; fileName: string; mimeType: string; size: number; storagePath: string; createdAt: string }
export interface UploadFileInput { entityType: string; entityId: string; originalName: string; mimeType: string; size: number; storagePath?: string; resource: ResourceScope }
export interface FileEntity { id:string;name:string;originalName:string;size:number;mimeType:string;url:string;storageKey:string;uploadedBy:string;entityType:'MEETING'|'MINUTES'|'DECISION'|'TASK'|'REPORT'|'REQUEST'|'KNOWLEDGE_ARTICLE';entityId:string;visibility:'PRIVATE'|'ENTITY'|'ORGANIZATION';createdAt:string;updatedAt:string }
export interface FileUploadRequest { file:File;entityType:FileEntity['entityType'];entityId:string;visibility?:FileEntity['visibility'] }
export interface UploadState { id:string;fileName:string;progress:number;status:'QUEUED'|'UPLOADING'|'COMPLETED'|'FAILED'|'CANCELLED';error?:string }
