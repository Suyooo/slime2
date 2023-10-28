import { useEffect, useRef } from 'react'
import Controls from './components/Controls'
import EventList from './components/EventList'
import ErrorBanner from './components/banner/ErrorBanner'
import LoadingBanner from './components/banner/LoadingBanner'
import { useClientDispatch } from './contexts/client/useContext'
import { EventListProvider } from './contexts/event-list/Provider'
import Twitch from './services/platforms/twitch/Twitch'
import { widgetStorage } from './services/storage'
import useAccessToken, {
  KeyInvalidError,
  KeyNotFoundError,
} from './services/useAccessToken'

export default function App() {
  const { status: twitchStatus, error: twitchError } = useAccessToken('twitch')
  const { status: youtubeStatus, error: youtubeError } =
    useAccessToken('google')
  const clientReady = useRef(false)
  const dispatch = useClientDispatch()

  // set functions for global var slime2
  useEffect(() => {
    if (clientReady.current) return

    function setOnEvent(setFunction: Slime2.Client.OnEvent) {
      dispatch({ type: 'event', setFunction })
    }

    function setKey(provider: Slime2.Auth.Provider, key: string) {
      dispatch({ type: 'key', provider, key })
    }

    // allow client to use these functions
    globalThis.slime2 = {
      onEvent: setOnEvent,
      setKey: setKey,
      storage: widgetStorage,
    }

    dispatchEvent(new CustomEvent('slime2:ready'))

    clientReady.current = true
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  if (twitchStatus === 'error' || youtubeStatus === 'error') {
    if (
      [twitchError, youtubeError].every(
        error => error instanceof KeyNotFoundError,
      )
    ) {
      return <ErrorBanner message='No key found.' />
    }

    if (twitchError instanceof KeyInvalidError) {
      return <ErrorBanner message='Twitch key expired.' />
    }

    if (youtubeError instanceof KeyInvalidError) {
      return <ErrorBanner message='YouTube key expired.' />
    }
  }

  const loading = [twitchStatus, youtubeStatus].some(
    status => status === 'pending',
  )

  if (loading) {
    return <LoadingBanner message='Verifying Key...' />
  }

  return (
    <EventListProvider>
      <div className='absolute inset-x-0'>
        <Twitch />
      </div>
      <Controls />
      <EventList />
    </EventListProvider>
  )
}
