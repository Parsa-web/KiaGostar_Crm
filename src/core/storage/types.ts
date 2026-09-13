export interface StorageUpload{key:string;file:Blob;contentType:string;signal?:AbortSignal;onProgress?(percent:number):void}
export interface StorageProvider{upload(input:StorageUpload):Promise<{key:string;url:string}>;delete(key:string):Promise<void>;getUrl(key:string):Promise<string>;exists(key:string):Promise<boolean>}
