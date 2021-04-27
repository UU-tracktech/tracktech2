/*

This program has been developed by students from the bachelor Computer Science at
Utrecht University within the Software Project course.
© Copyright Utrecht University (Department of Information and Computing Sciences)

 */

import React from 'react'
import { Queue } from 'queue-typescript'

import { indicator } from '../pages/home'
import { VideoPlayer, VideoPlayerProps } from './videojsPlayer'
import { Box, QueuItem } from '../classes/clientMessage'
import { websocketContext } from './websocketContext'
import { StartOrchestratorMessage } from '../classes/orchestratorMessage'

export type overlayProps = { cameraId: string, showBoxes: indicator }
type size = { width: number, height: number, left: number, top: number }
export function Overlay(props: overlayProps & VideoPlayerProps) {
  var queue = new Queue<QueuItem>()
  var playerFrameId = 0
  var frameId = 0
  var playerPlaying = false
  
  const [boxes, setBoxes] = React.useState<Box[]>([])
  const [size, setSize] = React.useState<size>({ width: 100, height: 100, left: 100, top: 100 })

  const socketContext = React.useContext(websocketContext)
  
  React.useEffect(() => {
    var id = socketContext.addListener(props.cameraId, (boxes: Box[], fID: number) => {
      if(playerPlaying)
      {
        queue.enqueue(new QueuItem(fID, boxes))
      }
    })
    setInterval(() => handleQueue(), 1000/24)
  }, [])

  function handleQueue() {
    console.log(queue.length)
    while(playerFrameId > frameId)
    {
      if(queue.length > 0)
      {
        let new_item = queue.dequeue()
        setBoxes(new_item.boxes)
        frameId = new_item.frameId
      }else
      {
        break
      }
    }
  }

  return <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <div style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden' }}>
      {DrawOverlay()}
    </div>
    <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
      <VideoPlayer onTimestamp={(t) => playerFrameId = t} onPlayPause={(p) => playerPlaying = p} onResize={(w, h, l, t) => setSize({ width: w, height: h, left: l, top: t })} autoplay={false} controls={true} onUp={() => props.onUp()} onDown={() => props.onDown()} sources={props.sources} />
    </div>
  </div >

  function onBoxClick(boxId: number, frameId: number) {
    if (window.confirm('Start tracking this object?')) {
      socketContext.send(new StartOrchestratorMessage(props.cameraId, frameId, boxId))
    }
  }

  function DrawOverlay(): JSX.Element {
    switch (props.showBoxes) {
      case 'All': {
        return DrawBoxes(boxes, frameId)
      }
      case 'Selection': {
        return DrawBoxes(boxes.filter(x => x.objectId !== undefined), frameId)
      }
      default: {
        return <div />
      }
    }
  }

  function DrawBoxes(boxes: Box[], frameId: number): JSX.Element {
    // TODO: make sure objectIds can be infinitely big without causing an index out of bounds
    var colordict: string[] = ['Green', 'Red', 'Yellow', 'Blue', 'Purple', 'Brown', 'Aqua', 'Navy']

    return <div>
      {
        boxes.map((box) => {
          var x1 = box.rect[0], x2 = box.rect[2], y1 = box.rect[1], y2 = box.rect[3]
          if (x1 > x2) {
            var tempx = x1
            x1 = x2
            x2 = tempx
          }
          if (y1 > y2) {
            var tempy = y1
            y1 = y2
            y2 = tempy
          }

          return <div key={box.boxId} style={
            {
              position: 'absolute',
              left: `${x1 * size.width + size.left}px`, top: `${y1 * size.height + size.top}px`,
              width: `${(x2 - x1) * size.width}px`, height: `${(y2 - y1) * size.height}px`,
              borderColor: colordict[box.objectId ?? 0], borderStyle: 'solid',
              /* transitionProperty: 'all', transitionDuration: '1s', */
              zIndex: 1000,
              cursor: box.objectId === undefined ? 'pointer' : 'default'
            }
          } onClick={() => { if (box.objectId === undefined) onBoxClick(box.boxId, frameId) }} />
        })
      }
    </div>
  }
}
