export const LoadingState = ({ label = 'در حال بارگذاری…' }: { label?: string }) => <p role="status" className="state-message">{label}</p>
export const EmptyState = ({ label = 'اطلاعاتی برای نمایش وجود ندارد.' }: { label?: string }) => <p className="state-message">{label}</p>
export const ErrorState = ({ message }: { message: string }) => <p role="alert" className="state-message state-message--error">{message}</p>
