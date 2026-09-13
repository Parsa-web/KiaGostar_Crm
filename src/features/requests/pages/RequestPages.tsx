import {RequestsCollectionPage,type RequestsCollectionPageProps} from './RequestModulePages'
/** Legacy entry point kept for route compatibility — it delegates to the shared enterprise request pages. */
export const RequestsPage = (props: RequestsCollectionPageProps) => <RequestsCollectionPage {...props} />
