export const LoadingSpinner = ({ label = 'در حال بارگذاری' }: { label?: string }) => <span className="spinner" role="status"><span className="sr-only">{label}</span></span>
export const SkeletonLoader = ({ rows = 3 }: { rows?: number }) => <div className="skeleton" aria-busy="true" aria-label="در حال بارگذاری">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>
export const PageLoader = () => <main className="page-loader"><LoadingSpinner /><p>در حال بارگذاری…</p></main>
export const ButtonLoader = () => <LoadingSpinner label="در حال انجام" />
