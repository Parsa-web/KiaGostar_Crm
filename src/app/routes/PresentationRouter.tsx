import {useCallback,useEffect,useMemo,useState} from 'react'
import {useAuth} from '../../features/auth'
import {can,type AuthorizedPrincipal} from '../../security'
import {privateRoutes} from '../../routes'
import {LoginPage} from '../../features/auth/pages/LoginPage'
import {AppShell,QuickSearch} from '../layout'
import {filterNavigation} from '../navigation/navigationConfig'
import {getQuickActions} from '../navigation/quickActionConfig'
import {useAppLocation} from '../navigation/useAppLocation'
import {AccessDeniedPage,NotFoundPage} from './StatePages'
import {RouteErrorBoundary} from './RouteErrorBoundary'
import {RouteSurface} from './RouteSurface'
import {resolveDashboardTarget} from './dashboardTargets'
import {ToastProvider} from '../../components/ui/overlay/Toast'
import {appStore} from '../../stores'

const matchRoute=(path:string)=>privateRoutes.find((route)=>route.path===path||route.path!=='/'&&path.startsWith(`${route.path}/`))

export function PresentationRouter(){
 const auth=useAuth()
 const {path,navigate}=useAppLocation()
 const [searchOpen,setSearchOpen]=useState(false)
 const openSearch=useCallback(()=>setSearchOpen(true),[])
 const closeSearch=useCallback(()=>setSearchOpen(false),[])
 const principal:AuthorizedPrincipal=useMemo(()=>({userId:auth.userId,roles:auth.roles,capabilities:auth.capabilities,departmentIds:auth.departmentIds}),[auth.capabilities,auth.departmentIds,auth.roles,auth.userId])
 const groups=useMemo(()=>filterNavigation(principal),[principal])
 const quickActions=useMemo(()=>getQuickActions(principal),[principal])
 useEffect(()=>{appStore.setAppearanceUser(auth.userId||'anonymous')},[auth.userId])
 useEffect(()=>{
  const shortcut=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLocaleLowerCase()==='k'){event.preventDefault();setSearchOpen(true)}}
  document.addEventListener('keydown',shortcut)
  return()=>document.removeEventListener('keydown',shortcut)
 },[])
 useEffect(()=>{if(auth.isAuthenticated&&(path==='/'||path==='/login'))navigate('/dashboard',{replace:true})},[auth.isAuthenticated,navigate,path])
 if(auth.isLoading)return <AuthLoading/>
 if(!auth.isAuthenticated||!auth.currentUser)return <LoginPage onSuccess={()=>navigate('/dashboard',{replace:true})}/>
 const route=matchRoute(path)
 const allowed=route?.access==='authenticated'||Boolean(route?.capability&&can(auth,route.capability))||Boolean(route?.access==='scope'&&route.capability&&can(auth,`${route.capability}.self`))
 const content=!route?<NotFoundPage/>:!allowed?<AccessDeniedPage/>:<RouteSurface path={path} userId={auth.userId} onNavigate={(target,id)=>navigate(resolveDashboardTarget(target,id),{replace:false})}/>
 return <ToastProvider><AppShell principal={principal} user={auth.currentUser} path={path} quickActions={quickActions} onLogout={async()=>{await auth.logout();navigate('/login',{replace:true})}} onSearch={openSearch}><RouteErrorBoundary routeKey={path}>{content}</RouteErrorBoundary><QuickSearch open={searchOpen} groups={groups} onClose={closeSearch}/></AppShell></ToastProvider>
}

function AuthLoading(){return <main className="auth-loading" role="status" aria-label="در حال آماده‌سازی سامانه"><div className="auth-loading__brand"><div className="brand-mark__symbol" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M7 6h18v6H13v4h9v10H7v-6h9v-4H7z"/></svg></div><strong className="title-large">کیا گستر</strong><span className="text-muted">در حال آماده‌سازی فضای کاری…</span><span className="auth-loading__bar"/></div></main>}
