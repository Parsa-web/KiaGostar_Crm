export interface SyncEvent<T=unknown>{type:string;resource:string;entityId:string;payload?:T;occurredAt:string}
export class SyncService{private listeners=new Set<(event:SyncEvent)=>void>();publish(event:SyncEvent){this.listeners.forEach((listener)=>listener(event))}subscribe(listener:(event:SyncEvent)=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener)}}}
