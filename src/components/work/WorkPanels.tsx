import type {ReactNode} from 'react'
import {Avatar,Button,Card,EmptyState,Icon,LoadingState,StatusBadge,Tag,TagList,TagListItem,type IconName} from '../ui'
import {formatFileSize,formatNumber,formatPersianDate,formatRelativeTime} from '../../core/utils'
import {cx} from '../ui/utils'
export interface PanelProps{title:ReactNode;icon?:IconName;description?:ReactNode;actions?:ReactNode;count?:number;loading?:boolean;error?:ReactNode;onRetry?():void;children:ReactNode;className?:string;collapsible?:boolean}
export function WorkPanel({title,icon,description,actions,count,loading=false,error,onRetry,children,className}:PanelProps){
 return <Card className={cx('work-panel',className)}>
  <header className="work-panel__head">
   <div className="work-panel__title">
    {icon&&<span className="work-panel__icon" aria-hidden="true"><Icon name={icon} size="sm"/></span>}
    <h2 className="work-panel__heading">{title}</h2>
    {count!==undefined&&<span className="work-panel__count">{formatNumber(count)}</span>}
   </div>
   {actions&&<div className="work-panel__actions">{actions}</div>}
  </header>
  {description&&<p className="work-panel__description">{description}</p>}
  <div className="work-panel__body">
   {loading?<LoadingState variant="list" rows={3}/>:error?<div className="work-panel__error" role="alert"><p>{error}</p>{onRetry&&<Button size="sm" variant="secondary" onClick={onRetry}>تلاش دوباره</Button>}</div>:children}
  </div>
 </Card>
}
export interface CommentItem{id:string;authorName:string;authorAvatar?:string;createdAt:string;content:string;attachments?:readonly {id:string;name:string}[]}
export interface CommentsPanelProps{comments:readonly CommentItem[];title?:ReactNode;loading?:boolean;emptyLabel?:string;composer?:ReactNode;className?:string}
export function CommentsPanel({comments,title='یادداشت‌ها و نظرات',loading=false,emptyLabel='نظری ثبت نشده است',composer,className}:CommentsPanelProps){
 return <WorkPanel title={title} icon="report" count={comments.length} loading={loading} className={className}>
  {comments.length?<ul className="comments">
   {comments.map((comment)=><li key={comment.id} className="comments__item">
    <Avatar name={comment.authorName} alt={comment.authorName} src={comment.authorAvatar} size="sm"/>
    <div className="comments__body">
     <div className="comments__meta"><strong className="comments__author">{comment.authorName}</strong><time dateTime={comment.createdAt} className="comments__time">{formatRelativeTime(comment.createdAt)}</time></div>
     <p className="comments__content">{comment.content}</p>
     {comment.attachments&&comment.attachments.length>0&&<TagList>{comment.attachments.map((file)=><TagListItem key={file.id}><Tag icon="folder" size="sm">{file.name}</Tag></TagListItem>)}</TagList>}
    </div>
   </li>)}
  </ul>:<EmptyState compact variant="inline" icon="report" title={emptyLabel}/>}
  {composer&&<div className="comments__composer">{composer}</div>}
 </WorkPanel>
}
export interface AttachmentItem{id:string;name:string;mimeType:string;sizeBytes:number;uploaderName:string;uploadedAt:string}
export interface AttachmentsPanelProps{attachments:readonly AttachmentItem[];title?:ReactNode;loading?:boolean;emptyLabel?:string;actions?:ReactNode;onPreview?(item:AttachmentItem):void;onRemove?(item:AttachmentItem):void;className?:string}
const fileKind=(mimeType:string)=>mimeType.includes('pdf')?'PDF':mimeType.startsWith('image/')?'تصویر':mimeType.includes('word')?'سند':mimeType.includes('excel')||mimeType.includes('sheet')?'صفحه‌گسترده':'فایل'
export function AttachmentsPanel({attachments,title='پیوست‌ها',loading=false,emptyLabel='پیوستی ثبت نشده است',actions,onPreview,onRemove,className}:AttachmentsPanelProps){
 return <WorkPanel title={title} icon="folder" count={attachments.length} loading={loading} actions={actions} className={className}>
  {attachments.length?<ul className="attachments">
   {attachments.map((item)=><li key={item.id} className="attachments__item">
    <span className="attachments__kind" aria-hidden="true"><Icon name="folder" size="sm"/></span>
    <div className="attachments__body">
     <button type="button" className="attachments__name" onClick={onPreview?()=>onPreview(item):undefined} disabled={!onPreview}>{item.name}</button>
     <span className="attachments__meta">{fileKind(item.mimeType)} · {formatFileSize(item.sizeBytes)} · {item.uploaderName} · <time dateTime={item.uploadedAt}>{formatPersianDate(item.uploadedAt,{dateStyle:'short'})}</time></span>
    </div>
    {onRemove&&<Button size="sm" variant="text" className="is-danger" onClick={()=>onRemove(item)}>حذف</Button>}
   </li>)}
  </ul>:<EmptyState compact variant="inline" icon="folder" title={emptyLabel}/>}
 </WorkPanel>
}
export interface RelatedLink{id:string;label:ReactNode;description?:ReactNode;icon?:IconName;status?:string;onNavigate?():void}
export function RelatedLinksPanel({links,title='اطلاعات مرتبط',emptyLabel='مورد مرتبطی ثبت نشده است',className}:{links:readonly RelatedLink[];title?:ReactNode;emptyLabel?:string;className?:string}){
 return <WorkPanel title={title} icon="workflow" count={links.length} className={className}>
  {links.length?<ul className="related-links">
   {links.map((link)=><li key={link.id}>
    <button type="button" className="related-links__item" onClick={link.onNavigate} disabled={!link.onNavigate}>
     <span className="related-links__icon" aria-hidden="true"><Icon name={link.icon??'workflow'} size="sm"/></span>
     <span className="related-links__body"><span className="related-links__label">{link.label}</span>{link.description&&<span className="related-links__description">{link.description}</span>}</span>
     {link.status&&<StatusBadge status={link.status} size="sm"/>}
     <Icon name="chevron" size="xs" directional className="related-links__chevron"/>
    </button>
   </li>)}
  </ul>:<EmptyState compact variant="inline" title={emptyLabel}/>}
 </WorkPanel>
}
export interface QuickActionItem{id:string;label:ReactNode;description?:ReactNode;icon?:IconName;onSelect?():void;disabled?:boolean}
export function QuickActionsPanel({actions,title='اقدامات سریع',columns=2,className}:{actions:readonly QuickActionItem[];title?:ReactNode;columns?:1|2|3;className?:string}){
 if(!actions.length)return null
 return <WorkPanel title={title} icon="plus" className={className}>
  <ul className={cx('quick-actions',`quick-actions--${columns}`)}>
   {actions.map((action)=><li key={action.id}>
    <button type="button" className="quick-actions__item" onClick={action.onSelect} disabled={action.disabled||!action.onSelect}>
     <span className="quick-actions__icon" aria-hidden="true"><Icon name={action.icon??'plus'} size="sm"/></span>
     <span className="quick-actions__body"><span className="quick-actions__label">{action.label}</span>{action.description&&<span className="quick-actions__description">{action.description}</span>}</span>
    </button>
   </li>)}
  </ul>
 </WorkPanel>
}
