import type {ReactNode} from 'react'
export const StandardPage=({children}:{children:ReactNode})=><div className="page-container">{children}</div>
export const NarrowPage=({children}:{children:ReactNode})=><div className="page-container page-container--narrow">{children}</div>
export const WideWorkspace=({children}:{children:ReactNode})=><div className="page-container page-container--wide">{children}</div>
export const SplitView=({list,detail}:{list:ReactNode;detail:ReactNode})=><div className="split-layout"><aside>{list}</aside><section>{detail}</section></div>
export const FullHeightWorkspace=({children}:{children:ReactNode})=><div className="workspace-layout full-height">{children}</div>
export const CenteredStateLayout=({children}:{children:ReactNode})=><div className="centered-layout">{children}</div>
export const DashboardLayout=({children,aside}:{children:ReactNode;aside?:ReactNode})=><div className="dashboard-layout"><div className="dashboard-layout__main">{children}</div>{aside&&<aside>{aside}</aside>}</div>
export const SettingsLayout=({navigation,children,actions}:{navigation:ReactNode;children:ReactNode;actions?:ReactNode})=><div className="split-layout"><nav>{navigation}</nav><section>{children}{actions&&<footer className="sticky-actions">{actions}</footer>}</section></div>
