import {useSyncExternalStore} from 'react'
import {appStore} from './appStore'

export function useAppAppearance(){
 return useSyncExternalStore(appStore.subscribe,appStore.getState,appStore.getState)
}
