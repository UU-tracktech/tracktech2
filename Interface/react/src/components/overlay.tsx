/*

This program has been developed by students from the bachelor Computer Science at
Utrecht University within the Software Project course.
© Copyright Utrecht University (Department of Information and Computing Sciences)

 */

import React from 'react'
import { Queue } from 'queue-typescript'

import { indicator } from '../pages/home'
import { VideoPlayer, VideoPlayerProps } from './videojsPlayer'
import { Box, QueueItem } from '../classes/clientMessage'
import { websocketContext } from './websocketContext'
import { StartOrchestratorMessage } from '../classes/orchestratorMessage'

export type overlayProps = { cameraId: string; showBoxes: indicator }
type size = { width: number; height: number; left: number; top: number }
export function Overlay(props: overlayProps & VideoPlayerProps) {
  const queueRef = React.useRef(new Queue<QueueItem>()) //Queue which keeps the incoming bounding boxes and the frameID at which they should be drawn
  const playerFrameIdRef = React.useRef(0) //The frameID the video player is currently displaying
  const frameIdRef = React.useRef(0) //The frameID of the boxes that are currently drawn
  const playerPlayingRef = React.useRef(false) //If the video player is paused or not

  const [boxes, setBoxes] = React.useState<Box[]>([]) //Contains the boxes to be drawn this frame
  const [size, setSize] = React.useState<size>({
    width: 10,
    height: 10,
    left: 10,
    top: 10
  }) //Videoplayer dimensions/position

  const socketContext = React.useContext(websocketContext)

  React.useEffect(() => {
    //Create a listener for the websocket which receives boundingbox messages
    //Put the messages in a Queue so the boxes are kept until it's time to draw them
    var id = socketContext.addListener(
      props.cameraId,
      (boxes: Box[], fID: number) => {
        //only accept new bounding boxes when the video is actually playing
        //This prevents the boxes from updating while the video is paused
        if (playerPlayingRef.current) {
          queueRef.current.enqueue(new QueueItem(fID, boxes))
        }
      }
    )
    //Start an interval to take boxes from the queue for drawing
    setInterval(() => handleQueue(), 1000 / 24)
    return socketContext.removeListener(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Dequeues boundingboxes until a set of boxes is found that correspond to the current frameID
   * Once the correct set of boxes has been reached it will set these to be drawn
   */
  function handleQueue() {
    //Keep dequeue-ing until a set of boxes with matching frameID
    while (playerFrameIdRef.current >= frameIdRef.current) {
      if (queueRef.current.length > 0) {
        let new_item = queueRef.current.dequeue()
        //set the boxes to be drawn
        setBoxes(new_item.boxes)
        frameIdRef.current = new_item.frameId
      } else {
        break
      }
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        {DrawOverlay()}
      </div>
      <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
        <VideoPlayer
          onTimestamp={(t) => (playerFrameIdRef.current = t)}
          onPlayPause={(p) => (playerPlayingRef.current = p)}
          onResize={(w, h, l, t) =>
            setSize({ width: w, height: h, left: l, top: t })
          }
          autoplay={false}
          controls={true}
          onPrimary={props.onPrimary}
          sources={props.sources}
        />
      </div>
    </div>
  )

  function onBoxClick(boxId: number, frameId: number) {
    if (window.confirm('Start tracking this object?')) {
      socketContext.send(
        new StartOrchestratorMessage(props.cameraId, frameId, boxId)
      )
    }
  }

  function DrawOverlay(): JSX.Element {
    switch (props.showBoxes) {
      case 'All': {
        return DrawBoxes(boxes, frameIdRef.current)
      }
      case 'Selection': {
        return DrawBoxes(
          boxes.filter((x) => x.objectId !== undefined),
          frameIdRef.current
        )
      }
      default: {
        return <div />
      }
    }
  }

  function DrawBoxes(boxes: Box[], frameId: number): JSX.Element {
    // TODO: make sure objectIds can be infinitely big without causing an index out of bounds
    var colordict: string[] = [
      'Green',
      'Red',
      'Yellow',
      'Blue',
      'Purple',
      'Brown',
      'Aqua',
      'Navy'
    ]
    return (
      <div>
        {boxes.map((box) => {
          var x1 = box.rect[0],
            x2 = box.rect[2],
            y1 = box.rect[1],
            y2 = box.rect[3]
          if (x1 > x2) [x1, x2] = [x2, x1]
          if (y1 > y2) [y1, y2] = [y2, y1]

          return (
            <div
              key={box.boxId}
              style={{
                position: 'absolute',
                left: `${x1 * size.width + size.left}px`,
                top: `${y1 * size.height + size.top}px`,
                width: `${(x2 - x1) * size.width}px`,
                height: `${(y2 - y1) * size.height}px`,
                borderColor: colordict[box.objectId ?? 0],
                borderStyle: 'solid',
                /* transitionProperty: 'all', transitionDuration: '1s', */
                zIndex: 1000,
                cursor: box.objectId === undefined ? 'pointer' : 'default'
              }}
              onClick={() => {
                if (box.objectId === undefined) onBoxClick(box.boxId, frameId)
              }}
            />
          )
        })}
      </div>
    )
  }
}
