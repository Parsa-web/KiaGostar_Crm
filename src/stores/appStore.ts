export type ColorSchemePreference = 'light' | 'dark' | 'system'
export type InterfaceTheme = 'brand' | 'neutral'
export type InterfaceFont = 'brand' | 'system'
export type InterfaceDensity = 'comfortable' | 'compact'

export interface AppearancePreferences {
  colorScheme: ColorSchemePreference
  theme: InterfaceTheme
  font: InterfaceFont
  density: InterfaceDensity
}

export interface AppState {
  locale: 'fa'
  direction: 'rtl'
  initialized: boolean
  appearanceUserId: string
  appearance: AppearancePreferences
}

type Listener = () => void
const DEFAULT_APPEARANCE: AppearancePreferences = {colorScheme:'light',theme:'brand',font:'brand',density:'comfortable'}
const STORAGE_PREFIX='kiagostar.appearance.v1.'
let state:AppState={locale:'fa',direction:'rtl',initialized:false,appearanceUserId:'anonymous',appearance:DEFAULT_APPEARANCE}
const listeners=new Set<Listener>()

const isBrowser=()=>typeof window!=='undefined'&&typeof document!=='undefined'
const storageKey=(userId:string)=>`${STORAGE_PREFIX}${userId||'anonymous'}`
const validAppearance=(value:unknown):AppearancePreferences=>{
 const input=(value&&typeof value==='object'?value:{}) as Partial<AppearancePreferences>
 return {
  colorScheme:input.colorScheme==='dark'||input.colorScheme==='system'?input.colorScheme:'light',
  theme:input.theme==='neutral'?'neutral':'brand',
  font:input.font==='system'?'system':'brand',
  density:input.density==='compact'?'compact':'comfortable',
 }
}
const resolveScheme=(preference:ColorSchemePreference)=>preference==='system'&&isBrowser()
 ?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')
 :preference==='dark'?'dark':'light'
const applyAppearance=(appearance:AppearancePreferences)=>{
 if(!isBrowser())return
 const root=document.documentElement
 root.dataset.colorScheme=resolveScheme(appearance.colorScheme)
 root.dataset.theme=appearance.theme
 root.dataset.font=appearance.font
 root.dataset.density=appearance.density
 root.style.colorScheme=resolveScheme(appearance.colorScheme)
}
const emit=()=>{applyAppearance(state.appearance);listeners.forEach((listener)=>listener())}
const persist=()=>{if(isBrowser())window.localStorage.setItem(storageKey(state.appearanceUserId),JSON.stringify(state.appearance))}

if(isBrowser())window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(state.appearance.colorScheme==='system')emit()})

export const appStore={
 getState:()=>state as Readonly<AppState>,
 setInitialized(initialized:boolean){state={...state,initialized};emit()},
 setAppearanceUser(userId:string){
  const nextUser=userId||'anonymous'
  if(nextUser===state.appearanceUserId){applyAppearance(state.appearance);return}
  let appearance=DEFAULT_APPEARANCE
  if(isBrowser())try{appearance=validAppearance(JSON.parse(window.localStorage.getItem(storageKey(nextUser))??'null'))}catch{appearance=DEFAULT_APPEARANCE}
  state={...state,appearanceUserId:nextUser,appearance};emit()
 },
 updateAppearance(patch:Partial<AppearancePreferences>){
  state={...state,appearance:validAppearance({...state.appearance,...patch})};persist();emit()
 },
 resetAppearance(){state={...state,appearance:DEFAULT_APPEARANCE};persist();emit()},
 subscribe(listener:Listener){listeners.add(listener);return()=>listeners.delete(listener)},
}

applyAppearance(state.appearance)
