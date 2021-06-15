/*

This program has been developed by students from the bachelor Computer Science at
Utrecht University within the Software Project course.
© Copyright Utrecht University (Department of Information and Computing Sciences)

 */

/*
  This component creates a videoplayer using the VideoJS plugin
*/

import React, { useRef, useEffect } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import { size } from '../classes/size'
import { Box } from '../classes/clientMessage'
import { useKeycloak } from '@react-keycloak/web'
import useAuthState from '../classes/useAuthState'

// The properties used by the videoplayer
export type VideoPlayerProps = {
  setSnapCallback: (snap: (box: Box) => string | undefined) => void
  onTimestamp: (time: number) => void //Callback which updates the timestamp for the overlay
  onPlayPause: (playing: boolean) => void //Callback which updates the playback state for the overlay
  onPrimary: () => void //Callback to make this videoplayer the primary video player
  onResize?: (size: size) => void //Callback to update viewport on resize
} & videojs.PlayerOptions

export function VideoPlayer(props: VideoPlayerProps) {
  //Authentication hooks
  const { keycloak } = useKeycloak()
  const status = useAuthState()

  // The DOM node to attach the videoplayer to
  const videoRef = useRef<HTMLVideoElement>(null)

  // The videoplayer object
  const playerRef = useRef<videojs.Player>()

  // Use the snap function callback to give the parent the ability to create snaps
  useEffect(() => {
    props.setSnapCallback(takeSnapshot)
  }, [props.setSnapCallback])

  //Constants used to calculate the timestamp of the livestream based on segment file names
  const initialUriIntervalRef = useRef<number>() //How often to check for the initial segment name
  const changeIntervalRef = useRef<number>() //how often to check for a new segemnt after the inital has been obtained
  const updateIntervalRef = useRef<number>() //How often to update the timestamp once it's known

  var startUri //The name of the first segment received by the videoplayer
  var startTime //The timestamp of the stream where the player was started
  var timeStamp //The current timestamp of the stream
  var playerSwitchTime //The timestamp of when the video player switch to the second segment
  var playerStartTime //The current time of the video player when it's first being played
  var bufferTimer //The interval that counts down while buffering
  var bufferTime //Time to wait during bufferring before giving up on the stream

  useEffect(() => {
    // Add a token query parameter to the src, this will be used for the index file but not in subsequent requests
    // Time spend on trying to use a single way of authentication:
    // 5hrs
    // Please update if appropriate.
    if (props.sources?.[0].src)
      props.sources[0].src += `?Bearer=${keycloak.token}`

    // instantiate video.js
    playerRef.current = videojs(videoRef.current, props, () => {
      var player = playerRef.current

      // If the user is authenticated, add xhr headers with the bearer token to authorize
      if (status == 'authenticated') {
        //@ts-ignore
        videojs.Vhs.xhr.beforeRequest = function (options) {
          //As headers might not exist yet, create them if not.
          options.headers = options.headers || {}
          options.headers.Authorization = `Bearer ${keycloak.token}`
          return options
        }
      }

      //Add button to make this videoplayer the primary player at the top of the page
      player?.controlBar.addChild(
        new extraButton(player, {
          onPress: props.onPrimary,
          icon: 'bi-zoom-in',
          text: 'Set primary'
        }),
        {},
        0
      )

      player?.on('playerresize', () => onResize())
      player?.on('play', () => onResize())
      player?.on('loadeddata', () => onResize())

      //Timestamp calculation
      /* On the first time a stream is started, attempt getting the
         segment name, keep going until a name is obtained */
      player?.on('firstplay', () => {
        playerStartTime = playerRef.current?.currentTime()
        initialUriIntervalRef.current = player?.setInterval(() => {
          getInitialUri()
        }, 200)
      })

      //Every time the videoplayer is resumed, go back to updating the timestamp
      player?.on('play', () => {
        updateIntervalRef.current = player?.setInterval(() => {
          updateTimestamp()
        }, 100)
        props.onPlayPause(true)
      })

      //Every time the player is paused, stop our manual timestamp update
      //The player.currentTime() method from videoJS will keep going in the background
      //If we don't stop our own update it will think the time while paused is double
      player?.on('pause', () => {
        if (updateIntervalRef.current)
          player?.clearInterval(updateIntervalRef.current)
        props.onPlayPause(false)
      })

      //When the player starts bufferring it fires the waiting event
      player?.on('waiting', () => {
        if (!startTime) return //prevent wonkyness on firstplay when there is no timestamp yet

        //Waiting may happen twice in a row, so prevent multiple timers
        if (!bufferTimer) {
          bufferTime = 15 //how long to wait for. TODO: make this not hardcoded
          const delta = 0.5 //update frequency, every <delta> seconds it checks the status

          //The interval will count down and show the alert if the countdown reaches 0
          bufferTimer = player?.setInterval(() => {
            bufferTime -= delta
            if (bufferTime <= 0) {
              //Clear the interval and show a message to the user showing the problem
              player?.clearInterval(bufferTimer)
              bufferTimer = undefined
              player?.pause()

              var modal = player?.createModal(
                'Unable to load stream. Check your connection or the video forwarder. Close this message to reload the stream.',
                null
              )

              //TODO: make the alert look better
              //The modal may overlap the default videojs error of "the media could not be loaded"
              //The modal can be given a custom class so we can adjust it with CSS
              //modal?.addClass('vjs-custom-modal')

              //Try to reload the videoplayer when the user closes the warning message
              modal?.on('modalclose', () => {
                if (props.sources && props.sources[0].type)
                  player?.src({
                    src: props.sources[0].src,
                    type: props.sources[0].type
                  })
                else if (props.sources)
                  player?.src({ src: props.sources[0].src })

                startTime = undefined
                player?.load()
              })
            }
          }, delta * 1000)
        }
      })

      //Seeked is fired when the player starts/resumes playing video
      //It seems to happen after a waiting but no guarantee it always happens after a waiting though
      //Use this as a signal to stop waiting for a buffer if the timer is running
      player?.on('seeked', () => {
        if (bufferTimer) {
          player?.clearInterval(bufferTimer)
          bufferTimer = undefined
        }
      })
    })

    return () => playerRef.current?.dispose()
  }, [])

  /**
   * Accesses the video player tech and returns the URI
   * from the first segment in the playlist
   */
  function getURI(): string | undefined {
    //passing any argument suppresses a warning about accessing the tech
    return playerRef.current?.tech({ randomArg: true })?.textTracks()?.[0]
      ?.activeCues?.[0]?.['value']?.uri
  }

  /**
   * Used in an interval, attempts to get an URI and
   * once it has one cancels itself, and starts a new
   * interval that waits for a change in URI
   */
  function getInitialUri() {
    //attempt to get the segment name
    let currentUri = getURI()
    if (currentUri) {
      //if a segment name has been found, save it and start looking for an updated name
      //console.log('InitialURI: ', currentUri)

      startUri = currentUri
      if (initialUriIntervalRef.current)
        playerRef.current?.clearInterval(initialUriIntervalRef.current)
      changeIntervalRef.current = playerRef.current?.setInterval(() => {
        lookForUriUpdate()
      }, 1000 / 24)
    }
  }

  /**
   * Used in an interval, attempts to get the URI of the current
   * segment, and compares this to the initial URI. If it is not
   * the same, cancels the interval and sets the time that
   * the timestamp will be based on
   */
  function lookForUriUpdate() {
    let currentUri = getURI()
    if (currentUri !== startUri) {
      //ensure it is a string because typescript
      if (typeof currentUri === 'string') {
        playerSwitchTime = playerRef.current?.currentTime()
        console.log('URI changed: ', currentUri)
        startTime = GetSegmentStarttime(currentUri)
        console.log('Starttime: ', PrintTimestamp(startTime))
        if (changeIntervalRef.current)
          playerRef.current?.clearInterval(changeIntervalRef.current)
      }
    }
  }

  /**
   * Should be done in an interval, started whenever the user hits play
   * this interval should be stopped whenever the user pauses
   */
  function updateTimestamp() {
    if (!startTime) {
      //console.log('Timestamp: Loading...')
      return
    }

    let currentPlayer = playerRef.current?.currentTime()
    timeStamp = startTime + currentPlayer - playerSwitchTime + 0.2

    //Update timestamp for overlay
    props.onTimestamp(timeStamp)

    //print this videoplayer info to console as 1 object
    // let toPrint = {
    //   timeStamp: PrintTimestamp(timeStamp),
    //   frameID: timeStamp,
    // }
    //console.log(toPrint)
  }

  /**
   * Calls the onResize callback function in order to let the overlay know the exact screen dimensions to scale to
   */
  function onResize() {
    if (playerRef.current && props.onResize) {
      var player = playerRef.current.currentDimensions()

      var playerWidth = player.width
      var playerHeight = player.height
      var playerAspect = playerWidth / playerHeight

      var videoWidth = playerRef.current.videoWidth()
      var videoHeight = playerRef.current.videoHeight()
      var videoAspect = videoWidth / videoHeight

      if (isNaN(videoAspect)) {
        videoAspect = 16 / 9
        if (playerAspect < videoAspect) {
          videoWidth = playerWidth
          videoHeight = (playerWidth / 16) * 9
        } else {
          videoWidth = (playerHeight / 9) * 16
          videoHeight = playerHeight
        }
      }

      if (playerAspect < videoAspect) {
        var widthRatio = playerWidth / videoWidth
        var actualVideoHeight = widthRatio * videoHeight
        props.onResize({
          width: playerWidth,
          height: actualVideoHeight,
          left: 0,
          top: (playerHeight - actualVideoHeight) / 2
        })
      } else {
        var heightRatio = playerHeight / videoHeight
        var actualVideoWidth = heightRatio * videoWidth
        props.onResize({
          width: actualVideoWidth,
          height: playerHeight,
          left: (playerWidth - actualVideoWidth) / 2,
          top: 0
        })
      }
    }
  }

  function takeSnapshot(box: Box) {
    if (videoRef.current) {
      var { left, top, width, height } = box.toSize(
        videoRef.current.videoWidth,
        videoRef.current.videoHeight
      )
      var canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      var context = canvas.getContext('2d')
      if (context) {
        context.drawImage(
          videoRef.current,
          left,
          top,
          width,
          height,
          0,
          0,
          width,
          height
        )
        return canvas.toDataURL()
      }
    }
  }

  // wrap the player in a div with a `data-vjs-player` attribute
  // so videojs won't create additional wrapper in the DOM
  // see https://github.com/videojs/video.js/pull/3856
  return (
    <div
      data-testid='videojsplayer'
      className='c-player'
      style={{ width: '100%', height: '100%' }}
    >
      <div
        className='c-player__screen vjs-fill'
        data-vjs-player='true'
        style={{ width: '100%', height: '100%' }}
      >
        <video ref={videoRef} className='video-js' />
      </div>
    </div>
  )
}

/**
 * Create an additional button on the control bar
 * See: https://stackoverflow.com/questions/35604358/videojs-v5-adding-custom-components-in-es6-am-i-doing-it-right
 */
export type ToggleSizeButtonOptions = {
  onPress: () => void
  icon: string
  text: string
}
class extraButton extends videojs.getComponent('Button') {
  private onClick: () => void

  constructor(player, options: ToggleSizeButtonOptions) {
    super(player, {})
    this.controlText(options.text)
    this.onClick = options.onPress
    this.addClass(options.icon)
  }

  public handleClick(_e) {
    this.onClick()
  }
}

/**
 * Takes a timestamp in seconds and converts it to a string
 * with the format mm:ss:ms
 * @param {number} time The time in seconds
 * @returns {string} The time formatted as mm:ss
 */
export function PrintTimestamp(time: number): string {
  let min = Math.floor(time / 60)
  //toFixed(1) makes it so it is rounded to 1 decimal
  let sec = (time % 60).toFixed(1)
  //to make it look pretty
  if (parseFloat(sec) < 10) sec = '0' + sec
  return min + ':' + sec
}

/**
 * Takes the filename of a segment of the stream and
 * determines the time of the video when this segment started
 * @param {string} segName The filename of the segment
 * @returns {number} The time in seconds
 */
export function GetSegmentStarttime(segName: string): number {
  //Assuming the forwarder will always send a stream using
  //HLS, which gives .ts files afaik
  if (!segName.endsWith('.ts')) {
    console.warn(
      'GetSegmentStarttime: expected .ts file but got something else'
    )
    return NaN
  }

  //filename should contain '_V' if it comes from the forwarder
  if (segName.indexOf('_V') === -1) {
    console.warn('Video file not from forwarder')
    return NaN
  }

  //filename ends with _VXYYY.ts where X is a version
  //and YYY is the segment number
  let end = segName.split('_V')[1]
  let number = end.slice(1, end.length - 3) //remove the X and the .ts
  //The segments have a certain length, so multiply the number with the length for the time
  //TODO: make this not hardcoded
  return (parseInt(number) - 1) * 2
}
