// This is a proxy route that forwards requests to the active transcript
// provider. This allows us to hide the service name from client-side code,
// and to swap providers by changing this one import.
//
// Currently: youtube-transcript.io
// To switch back to Oxylabs, change the import below to '../transcript-oxylabs/route'.
export { POST } from '../transcript-youtube-io/route';
