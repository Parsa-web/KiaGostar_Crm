export const isRequestOpen = (status: string) => !['REJECTED', 'COMPLETED'].includes(status)
