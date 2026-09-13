import { AttachmentList, FilePreview } from '../components'; import type { FileAttachment } from '../types'
export const FilesPage = ({ files }: { files: readonly FileAttachment[] }) => <section><h1>فایل‌ها</h1><AttachmentList files={files} /></section>
export const FileDetailsPage = ({ file }: { file: FileAttachment }) => <FilePreview file={file} />
