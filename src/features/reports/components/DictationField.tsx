import {useCallback,useState} from 'react'
import {Button,Icon,TextArea} from '../../../components/ui'
import {formatNumber} from '../../../core/utils'
import {useSpeechDictation} from '../hooks/useSpeechDictation'
import {appendDictatedText} from '../utils/persianDictation'
const METER_STEPS=[0.08,0.2,0.34,0.5,0.7] as const
const VOICE_COMMANDS=[
 {command:'نقطه · ویرگول · نقطه ویرگول',result:'.  ،  ؛'},
 {command:'علامت سوال · علامت تعجب · دو نقطه',result:'؟  !  :'},
 {command:'پرانتز باز · پرانتز بسته · درصد',result:'(  )  ٪'},
 {command:'خط جدید',result:'رفتن به سطر بعد'},
 {command:'پاراگراف جدید',result:'شروع بند تازه'},
] as const
export interface DictationFieldProps{label:string;value:string;onChange(next:string):void;error?:string;rows?:number;maxLength?:number;required?:boolean;autoFocus?:boolean;showCounter?:boolean}
/** The shared TextArea plus live Persian dictation; no new form pattern. */
export function DictationField({label,value,onChange,error,rows=8,maxLength,required=false,autoFocus=false,showCounter=true}:DictationFieldProps){
 const [hintsOpen,setHintsOpen]=useState(false)
 /* The hook always calls the latest callback, so appended speech never lands
    on a stale draft even though `value` is captured per render. */
 const commit=useCallback((text:string)=>{onChange(appendDictatedText(value,text))},[onChange,value])
 const dictation=useSpeechDictation({onCommit:commit})
 const statusLabel=dictation.status==='listening'?'در حال شنیدن… بفرمایید'
  :dictation.status==='starting'?'آماده‌سازی میکروفن…'
  :dictation.status==='error'?'گویش متوقف شد'
  :'گویش خاموش است'
 return <div className="dictation-field">
  <TextArea label={label} value={value} onChange={(event)=>onChange(event.target.value)} error={error} rows={rows} maxLength={maxLength} showCounter={showCounter} required={required} autoFocus={autoFocus} autoResize/>
  {dictation.supported?<div className="dictation-field__bar">
   <Button type="button" size="sm" variant={dictation.listening?'danger':'secondary'} startIcon={<Icon name={dictation.listening?'mic-off':'mic'} size="sm"/>} onClick={dictation.toggle}>{dictation.listening?'پایان گویش':'گویش فارسی'}</Button>
   <span className="dictation-field__meter" aria-hidden="true">{METER_STEPS.map((step)=><span key={step} className={`dictation-field__meter-bar${dictation.listening&&dictation.level>=step?' is-active':''}`}/>)}</span>
   <span className="dictation-field__status" role="status" aria-live="polite">{statusLabel}{dictation.confidence!==null&&<span className="dictation-field__confidence"> · دقت تشخیص {formatNumber(Math.round(dictation.confidence*100))}٪</span>}</span>
   <button type="button" className="dictation-field__help" onClick={()=>setHintsOpen((open)=>!open)} aria-expanded={hintsOpen}>دستورهای صوتی</button>
  </div>:<p className="dictation-field__note">مرورگر شما از تبدیل زندهٔ گفتار به متن پشتیبانی نمی‌کند؛ متن را دستی وارد کنید (کروم یا اج پیشنهاد می‌شود).</p>}
  {dictation.interim&&<p className="dictation-field__interim" aria-live="polite">{dictation.interim}</p>}
  {dictation.error&&<p className="dictation-field__error" role="alert">{dictation.error}</p>}
  {hintsOpen&&<dl className="dictation-field__hints">{VOICE_COMMANDS.map((item)=><div key={item.command} className="dictation-field__hint"><dt>{item.command}</dt><dd>{item.result}</dd></div>)}</dl>}
 </div>
}
