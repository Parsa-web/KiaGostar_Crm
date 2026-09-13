export type SecurityErrorKind='UNAUTHORIZED'|'FORBIDDEN'|'SESSION_EXPIRED'
export const securityErrorHandler=(kind:SecurityErrorKind)=>({kind,status:kind==='UNAUTHORIZED'||kind==='SESSION_EXPIRED'?401:403,message:kind==='FORBIDDEN'?'دسترسی مجاز نیست.':kind==='SESSION_EXPIRED'?'نشست شما منقضی شده است.':'ابتدا وارد سامانه شوید.'})
