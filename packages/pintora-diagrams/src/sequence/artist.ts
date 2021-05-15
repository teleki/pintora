import { GraphicsIR, IDiagramArtist, logger } from '@pintora/core'
import { Mark, MarkAttrs, Rect, Group, Text } from '@pintora/core/lib/type'
import { db, SequenceDiagramIR, LINETYPE, Message, PLACEMENT, Actor } from './db'
import type { SequenceConf } from './index'

let conf: SequenceConf = {
  mirrorActors: true,
  width: 80,
  height: 50,
  actorMargin: 10,
  boxMargin: 10,
  activationWidth: 10,

  messageFontSize: 16,
  messageFontFamily: 'menlo, sans-serif',
  messageFontWeight: 400,
}

const sequenceArtist: IDiagramArtist<SequenceDiagramIR> = {
  draw(ir, config?) {
    // conf = configApi.getConfig().sequence
    db.clear()
    // db.setWrap(conf.wrap)
    model.init()
    logger.debug(`C:${JSON.stringify(conf, null, 2)}`)

    // Fetch data from the parsing
    const { actors, messages, title } = ir
    const actorKeys = db.getActorKeys()

    const rootMark: Group = {
      type: 'group',
      attr: {},
      children: [],
    }

    const graphicsIR: GraphicsIR = {
      mark: rootMark,
    }

    const maxMessageWidthPerActor = getMaxMessageWidthPerActor(ir)
    // conf.height = calculateActorMargins(actors, maxMessageWidthPerActor)

    const { marks: actorRects } = drawActors(ir, actorKeys, 0)
    const loopWidths = calculateLoopBounds(messages, actors, maxMessageWidthPerActor)
    rootMark.children.push(...actorRects)

    // // The arrow head definition is attached to the svg once
    // // svgDraw.insertArrowHead(diagram)
    // // svgDraw.insertArrowCrossHead(diagram)
    // // svgDraw.insertArrowFilledHead(diagram)
    // // svgDraw.insertSequenceNumber(diagram)

    function activeEnd(msg, verticalPos) {
      const activationData = model.endActivation(msg)
      if (activationData.starty + 18 > verticalPos) {
        activationData.starty = verticalPos - 6
        verticalPos += 12
      }
      // TODO:
      // svgDraw.drawActivation(diagram, activationData, verticalPos, conf, actorActivations(msg.from.actor).length)

      model.insert(activationData.startx, verticalPos - 10, activationData.stopx, verticalPos)
    }

    // Draw the messages/signals
    let sequenceIndex = 1
    messages.forEach(function (msg) {
      let loopModel, noteModel, msgModel

      switch (msg.type) {
        // case LINETYPE.NOTE:
        //   noteModel = msg.noteModel
        //   drawNote(diagram, noteModel)
        //   break
        // case LINETYPE.ACTIVE_START:
        //   model.newActivation(msg, diagram, actors)
        //   break
        // case LINETYPE.ACTIVE_END:
        //   activeEnd(msg, model.getVerticalPos())
        //   break
        // case LINETYPE.LOOP_START:
        //   adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin, conf.boxMargin + conf.boxTextMargin, message =>
        //     model.newLoop(message),
        //   )
        //   break
        // case LINETYPE.LOOP_END:
        //   loopModel = model.endLoop()
        //   svgDraw.drawLoop(diagram, loopModel, 'loop', conf)
        //   model.bumpVerticalPos(loopModel.stopy - model.getVerticalPos())
        //   model.models.addLoop(loopModel)
        //   break
        // case LINETYPE.RECT_START:
        //   adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin, conf.boxMargin, message =>
        //     model.newLoop(undefined, message.message),
        //   )
        //   break
        // case LINETYPE.RECT_END:
        //   loopModel = model.endLoop()
        //   svgDraw.drawBackgroundRect(diagram, loopModel)
        //   model.models.addLoop(loopModel)
        //   model.bumpVerticalPos(loopModel.stopy - model.getVerticalPos())
        //   break
        // case LINETYPE.OPT_START:
        //   adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin, conf.boxMargin + conf.boxTextMargin, message =>
        //     model.newLoop(message),
        //   )
        //   break
        // case LINETYPE.OPT_END:
        //   loopModel = model.endLoop()
        //   svgDraw.drawLoop(diagram, loopModel, 'opt', conf)
        //   model.bumpVerticalPos(loopModel.stopy - model.getVerticalPos())
        //   model.models.addLoop(loopModel)
        //   break
        // case LINETYPE.ALT_START:
        //   adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin, conf.boxMargin + conf.boxTextMargin, message =>
        //     model.newLoop(message),
        //   )
        //   break
        // case LINETYPE.ALT_ELSE:
        //   adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin + conf.boxTextMargin, conf.boxMargin, message =>
        //     model.addSectionToLoop(message),
        //   )
        //   break
        // case LINETYPE.ALT_END:
        //   loopModel = model.endLoop()
        //   svgDraw.drawLoop(diagram, loopModel, 'alt', conf)
        //   model.bumpVerticalPos(loopModel.stopy - model.getVerticalPos())
        //   model.models.addLoop(loopModel)
        //   break
        // case LINETYPE.PAR_START:
        //   adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin, conf.boxMargin + conf.boxTextMargin, message =>
        //     model.newLoop(message),
        //   )
        //   break
        // case LINETYPE.PAR_AND:
        //   adjustLoopHeightForWrap(loopWidths, msg, conf.boxMargin + conf.boxTextMargin, conf.boxMargin, message =>
        //     model.addSectionToLoop(message),
        //   )
        //   break
        // case LINETYPE.PAR_END:
        //   loopModel = model.endLoop()
        //   svgDraw.drawLoop(diagram, loopModel, 'par', conf)
        //   model.bumpVerticalPos(loopModel.stopy - model.getVerticalPos())
        //   model.models.addLoop(loopModel)
        //   break
        default:
          try {
            msgModel = msg.msgModel // FI
            msgModel.starty = model.verticalPos
            msgModel.sequenceIndex = sequenceIndex
            drawMessage(ir, msgModel)
            model.messageMarks.push(msgModel)
          } catch (e) {
            logger.error('error while drawing message', e)
          }
      }
      // Increment sequence counter if msg.type is a line (and not another event like activation or note, etc)
      if (
        [
          LINETYPE.SOLID_OPEN,
          LINETYPE.DOTTED_OPEN,
          LINETYPE.SOLID,
          LINETYPE.DOTTED,
          LINETYPE.SOLID_CROSS,
          LINETYPE.DOTTED_CROSS,
          LINETYPE.SOLID_POINT,
          LINETYPE.DOTTED_POINT,
        ].includes(msg.type)
      ) {
        sequenceIndex++
      }
    })

    if (conf.mirrorActors) {
      // Draw actors below diagram
      model.bumpVerticalPos(conf.boxMargin * 2)
      drawActors(ir, actorKeys, model.verticalPos)
    }

    // const { bounds: box } = model.getBounds()

    // // Adjust line height of actor lines now that the height of the diagram is known
    // logger.debug('For line height fix Querying: #' + id + ' .actor-line')
    // const actorLines = selectAll('#' + id + ' .actor-line')
    // actorLines.attr('y2', box.stopy)

    // let height = box.stopy - box.starty + 2 * conf.diagramMarginY
    // if (conf.mirrorActors) {
    //   height = height - conf.boxMargin + conf.bottomMarginAdj
    // }

    // const width = box.stopx - box.startx + 2 * conf.diagramMarginX

    // if (title) {
    //   diagram
    //     .append('text')
    //     .text(title)
    //     .attr('x', (box.stopx - box.startx) / 2 - 2 * conf.diagramMarginX)
    //     .attr('y', -25)
    // }

    // configureSvgSize(diagram, height, width, conf.useMaxWidth)

    // const extraVertForTitle = title ? 40 : 0
    // diagram.attr(
    //   'viewBox',
    //   box.startx -
    //     conf.diagramMarginX +
    //     ' -' +
    //     (conf.diagramMarginY + extraVertForTitle) +
    //     ' ' +
    //     width +
    //     ' ' +
    //     (height + extraVertForTitle),
    // )
    // logger.debug(`bounds models:`, model.models)
    return graphicsIR
  },
}

class Model {
  sequenceItems: any
  activations: any
  data: {
    startx: number
    stopx: number
    starty: number
    stopy: number
  }
  verticalPos: number
  actorAttrsMap = new Map<string, MarkAttrs>()
  messageMarks: Text[]

  init() {
    this.sequenceItems = []
    this.activations = []
    this.messageMarks = []
    this.clear()
    this.data = {
      startx: undefined,
      stopx: undefined,
      starty: undefined,
      stopy: undefined,
    }
    this.verticalPos = 0
    // setConf(db.getConfig())
  }
  clear() {
    this.actorAttrsMap.clear()
  }
  updateVal(obj, key, val, fun) {
    if (typeof obj[key] === 'undefined') {
      obj[key] = val
    } else {
      obj[key] = fun(val, obj[key])
    }
  }
  updateBounds(startx, starty, stopx, stopy) {
    const _self = this
    let cnt = 0
    function updateFn(type?) {
      return function updateItemBounds(item) {
        cnt++
        // The loop sequenceItems is a stack so the biggest margins in the beginning of the sequenceItems
        const n = _self.sequenceItems.length - cnt + 1

        _self.updateVal(item, 'starty', starty - n * conf.boxMargin, Math.min)
        _self.updateVal(item, 'stopy', stopy + n * conf.boxMargin, Math.max)

        _self.updateVal(this.data, 'startx', startx - n * conf.boxMargin, Math.min)
        _self.updateVal(this.data, 'stopx', stopx + n * conf.boxMargin, Math.max)

        if (!(type === 'activation')) {
          _self.updateVal(item, 'startx', startx - n * conf.boxMargin, Math.min)
          _self.updateVal(item, 'stopx', stopx + n * conf.boxMargin, Math.max)

          _self.updateVal(this.data, 'starty', starty - n * conf.boxMargin, Math.min)
          _self.updateVal(this.data, 'stopy', stopy + n * conf.boxMargin, Math.max)
        }
      }
    }

    this.sequenceItems.forEach(updateFn())
    this.activations.forEach(updateFn('activation'))
  }
  insert(startx, starty, stopx, stopy) {
    const _startx = Math.min(startx, stopx)
    const _stopx = Math.max(startx, stopx)
    const _starty = Math.min(starty, stopy)
    const _stopy = Math.max(starty, stopy)

    this.updateVal(this.data, 'startx', _startx, Math.min)
    this.updateVal(this.data, 'starty', _starty, Math.min)
    this.updateVal(this.data, 'stopx', _stopx, Math.max)
    this.updateVal(this.data, 'stopy', _stopy, Math.max)

    this.updateBounds(_startx, _starty, _stopx, _stopy)
  }
  newActivation(message, diagram, actors) {
    const actorRect = actors[message.from.actor]
    const stackedSize = actorActivations(message.from.actor).length || 0
    const x = actorRect.x + actorRect.width / 2 + ((stackedSize - 1) * conf.activationWidth) / 2
    this.activations.push({
      startx: x,
      starty: this.verticalPos + 2,
      stopx: x + conf.activationWidth,
      stopy: undefined,
      actor: message.from.actor,
      // anchored: svgDraw.anchorElement(diagram), // TODO:
    })
  }
  endActivation(message: Message) {
    // find most recent activation for given actor
    const lastActorActivationIdx = this.activations
      .map(function (activation) {
        return activation.actor
      })
      .lastIndexOf(message.from.actor)
    return this.activations.splice(lastActorActivationIdx, 1)[0]
  }
  createLoop(title = { message: undefined, wrap: false, width: undefined }, fill) {
    return {
      startx: undefined,
      starty: this.verticalPos,
      stopx: undefined,
      stopy: undefined,
      title: title.message,
      wrap: title.wrap,
      width: title.width,
      height: 0,
      fill: fill,
    }
  }
  newLoop(title = { message: undefined, wrap: false, width: undefined }, fill) {
    this.sequenceItems.push(this.createLoop(title, fill))
  }
  endLoop() {
    return this.sequenceItems.pop()
  }
  addSectionToLoop(message: Message) {
    const loop = this.sequenceItems.pop()
    loop.sections = loop.sections || []
    loop.sectionTitles = loop.sectionTitles || []
    loop.sections.push({ y: this.verticalPos, height: 0 })
    loop.sectionTitles.push(message)
    this.sequenceItems.push(loop)
  }
  bumpVerticalPos(bump) {
    this.verticalPos = this.verticalPos + bump
    this.data.stopy = this.verticalPos
  }
  // getBounds() {
  //   return { bounds: this.data, models: this.models }
  // }

  getHeight() {
    return 100
    //  return (
    //    Math.max.apply(null, this.actors.length === 0 ? [0] : this.actors.map(actor => actor.height || 0)) +
    //    (this.loops.length === 0 ? 0 : this.loops.map(it => it.height || 0).reduce((acc, h) => acc + h)) +
    //    (this.messages.length === 0 ? 0 : this.messages.map(it => it.height || 0).reduce((acc, h) => acc + h)) +
    //    (this.notes.length === 0 ? 0 : this.notes.map(it => it.height || 0).reduce((acc, h) => acc + h))
    //  )
  }
}

const model = new Model()

const actorActivations = function (actor: string) {
  return model.activations.filter(function (activation) {
    return activation.actor === actor
  })
}

// export const bounds = {
//   verticalPos: 0,
//   sequenceItems: [],
//   activations: [],
//   models: {
//     getHeight: function () {
//       return (
//         Math.max.apply(null, this.actors.length === 0 ? [0] : this.actors.map(actor => actor.height || 0)) +
//         (this.loops.length === 0 ? 0 : this.loops.map(it => it.height || 0).reduce((acc, h) => acc + h)) +
//         (this.messages.length === 0 ? 0 : this.messages.map(it => it.height || 0).reduce((acc, h) => acc + h)) +
//         (this.notes.length === 0 ? 0 : this.notes.map(it => it.height || 0).reduce((acc, h) => acc + h))
//       )
//     },
//     clear: function () {
//       this.actors = []
//       this.loops = []
//       this.messages = []
//       this.notes = []
//     },
//     addLoop: function (loopModel) {
//       this.loops.push(loopModel)
//     },
//     addMessage: function (msgModel) {
//       this.messages.push(msgModel)
//     },
//     addNote: function (noteModel) {
//       this.notes.push(noteModel)
//     },
//     lastActor: function () {
//       return this.actors[this.actors.length - 1]
//     },
//     lastLoop: function () {
//       return this.loops[this.loops.length - 1]
//     },
//     lastMessage: function () {
//       return this.messages[this.messages.length - 1]
//     },
//     lastNote: function () {
//       return this.notes[this.notes.length - 1]
//     },
//     actors: [],
//     loops: [],
//     messages: [],
//     notes: [],
//   },

// }

interface IFont {
  fontFamily: string
  fontSize: number
  fontWeight: number | string
}

const CHARACTERS = '0123456789abcdef'
function makeid(length: number) {
  let result = ''
  let CHARACTERSLength = CHARACTERS.length
  for (let i = 0; i < length; i++) {
    result += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERSLength))
  }
  return result
}

// TODO: this should be implemented in the core package, here is just a simple mock
const utils = {
  makeid,
  calculateTextDimensions(text: string, font: IFont) {
    const lines = text.split('\n')
    let width = 0
    let height = 0
    lines.forEach((line, i) => {
      const w = line.length * 14
      width = Math.max(w, width)
      height += 14 + (i === 0 ? 0 : 8)
    })
    return {
      width,
      height,
    }
  },
}

const messageFont = (cnf: SequenceConf) => {
  return {
    fontFamily: cnf.messageFontFamily,
    fontSize: cnf.messageFontSize,
    fontWeight: cnf.messageFontWeight,
  }
}

/**
 * Draws a message
 */
const drawMessage = function (ir: SequenceDiagramIR, msgModel) {
  model.bumpVerticalPos(10)
  const { startx, stopx, starty, message, type, sequenceIndex } = msgModel
  const lines = common.splitBreaks(message).length
  let textDims = utils.calculateTextDimensions(message, messageFont(conf))
  const lineHeight = textDims.height / lines
  msgModel.height += lineHeight

  model.bumpVerticalPos(lineHeight)
  const t: Text
  const textObj = svgDraw.getTextObj()
  textObj.x = startx
  textObj.y = starty + 10
  textObj.width = stopx - startx
  textObj.class = 'messageText'
  textObj.dy = '1em'
  textObj.text = message
  textObj.fontFamily = conf.messageFontFamily
  textObj.fontSize = conf.messageFontSize
  textObj.fontWeight = conf.messageFontWeight
  textObj.anchor = conf.messageAlign
  textObj.valign = conf.messageAlign
  textObj.textMargin = conf.wrapPadding
  textObj.tspan = false

  drawText(g, textObj)

  let totalOffset = textDims.height - 10

  let textWidth = textDims.width

  let line, lineStarty
  if (startx === stopx) {
    lineStarty = model.getVerticalPos() + totalOffset
    if (conf.rightAngles) {
      line = g
        .append('path')
        .attr(
          'd',
          `M  ${startx},${lineStarty} H ${startx + Math.max(conf.width / 2, textWidth / 2)} V ${
            lineStarty + 25
          } H ${startx}`,
        )
    } else {
      totalOffset += conf.boxMargin

      lineStarty = model.getVerticalPos() + totalOffset
      line = g
        .append('path')
        .attr(
          'd',
          'M ' +
            startx +
            ',' +
            lineStarty +
            ' C ' +
            (startx + 60) +
            ',' +
            (lineStarty - 10) +
            ' ' +
            (startx + 60) +
            ',' +
            (lineStarty + 30) +
            ' ' +
            startx +
            ',' +
            (lineStarty + 20),
        )
    }

    totalOffset += 30
    const dx = Math.max(textWidth / 2, conf.width / 2)
    model.insert(
      startx - dx,
      model.getVerticalPos() - 10 + totalOffset,
      stopx + dx,
      model.getVerticalPos() + 30 + totalOffset,
    )
  } else {
    totalOffset += conf.boxMargin
    lineStarty = model.getVerticalPos() + totalOffset
    line = g.append('line')
    line.attr('x1', startx)
    line.attr('y1', lineStarty)
    line.attr('x2', stopx)
    line.attr('y2', lineStarty)
    model.insert(startx, lineStarty - 10, stopx, lineStarty)
  }
  // Make an SVG Container
  // Draw the line
  if (
    type === LINETYPE.DOTTED ||
    type === LINETYPE.DOTTED_CROSS ||
    type === LINETYPE.DOTTED_POINT ||
    type === LINETYPE.DOTTED_OPEN
  ) {
    line.style('stroke-dasharray', '3, 3')
    line.attr('class', 'messageLine1')
  } else {
    line.attr('class', 'messageLine0')
  }

  let url = ''
  if (conf.arrowMarkerAbsolute) {
    url = window.location.protocol + '//' + window.location.host + window.location.pathname + window.location.search
    url = url.replace(/\(/g, '\\(')
    url = url.replace(/\)/g, '\\)')
  }

  line.attr('stroke-width', 2)
  line.attr('stroke', 'none') // handled by theme/css anyway
  line.style('fill', 'none') // remove any fill colour
  if (type === LINETYPE.SOLID || type === LINETYPE.DOTTED) {
    line.attr('marker-end', 'url(' + url + '#arrowhead)')
  }
  if (type === LINETYPE.SOLID_POINT || type === LINETYPE.DOTTED_POINT) {
    line.attr('marker-end', 'url(' + url + '#filled-head)')
  }

  if (type === LINETYPE.SOLID_CROSS || type === LINETYPE.DOTTED_CROSS) {
    line.attr('marker-end', 'url(' + url + '#crosshead)')
  }

  // add node number
  if (sequenceDb.showSequenceNumbers() || conf.showSequenceNumbers) {
    line.attr('marker-start', 'url(' + url + '#sequencenumber)')
    g.append('text')
      .attr('x', startx)
      .attr('y', lineStarty + 4)
      .attr('font-family', 'sans-serif')
      .attr('font-size', '12px')
      .attr('text-anchor', 'middle')
      .attr('textLength', '16px')
      .attr('class', 'sequenceNumber')
      .text(sequenceIndex)
  }
  model.bumpVerticalPos(totalOffset)
  msgModel.height += totalOffset
  msgModel.stopy = msgModel.starty + msgModel.height
  model.insert(msgModel.fromBounds, msgModel.starty, msgModel.toBounds, msgModel.stopy)
}

export const drawActors = function (ir: SequenceDiagramIR, actorKeys: string[], verticalPos = 0): { marks: Mark[] } {
  // Draw the actors
  let prevWidth = 0
  let prevMargin = 0

  const marks: Rect[] = []

  for (let i = 0; i < actorKeys.length; i++) {
    const key = actorKeys[i]

    const attrs: MarkAttrs = model.actorAttrsMap.get(key) || {}

    // Add some rendering data to the object
    attrs.width = attrs.width || conf.width
    attrs.height = Math.max(attrs.height || attrs.height, attrs.height)
    attrs.margin = attrs.margin || conf.actorMargin

    attrs.x = prevWidth + prevMargin
    attrs.y = verticalPos

    // TODO: Draw the attached line

    model.insert(attrs.x, verticalPos, attrs.x + attrs.width, attrs.height)

    prevWidth += attrs.width
    prevMargin += attrs.margin

    // model.addActor(actor);

    marks.push({
      type: 'rect',
      class: 'actor',
      attr: attrs,
    })
    model.actorAttrsMap.set(key, attrs)
  }

  // Add a margin between the actor boxes and the first arrow
  model.bumpVerticalPos(conf.height)

  return { marks }
}

/**
 * Retrieves the max message width of each actor, supports signals (messages, loops)
 * and notes.
 *
 * It will enumerate each given message, and will determine its text width, in relation
 * to the actor it originates from, and destined to.
 */
const getMaxMessageWidthPerActor = function (ir: SequenceDiagramIR) {
  const { actors, messages } = ir
  const maxMessageWidthPerActor = {}

  messages.forEach(function (msg) {
    if (actors[msg.to] && actors[msg.from]) {
      const actor = actors[msg.to]
      const { prevActorId, nextActorId } = actor

      // If this is the first actor, and the message is left of it, no need to calculate the margin
      if (msg.placement === PLACEMENT.LEFTOF && !prevActorId) {
        return
      }

      // If this is the last actor, and the message is right of it, no need to calculate the margin
      if (msg.placement === PLACEMENT.RIGHTOF && !actor.nextActorId) {
        return
      }

      const isNote = msg.placement !== undefined
      const isMessage = !isNote

      // const textFont = isNote ? noteFont(conf) : messageFont(conf);
      // let wrappedMessage = msg.wrap
      //   ? utils.wrapLabel(msg.message, conf.width - 2 * conf.wrapPadding, textFont)
      //   : msg.message;
      // const messageDimensions = utils.calculateTextDimensions(wrappedMessage, textFont);
      // const messageWidth = messageDimensions.width + 2 * conf.wrapPadding;

      const messageWidth = 90 // FIXME: need text width calculation

      /*
       * The following scenarios should be supported:
       *
       * - There's a message (non-note) between fromActor and toActor
       *   - If fromActor is on the right and toActor is on the left, we should
       *     define the toActor's margin
       *   - If fromActor is on the left and toActor is on the right, we should
       *     define the fromActor's margin
       * - There's a note, in which case fromActor == toActor
       *   - If the note is to the left of the actor, we should define the previous actor
       *     margin
       *   - If the note is on the actor, we should define both the previous and next actor
       *     margins, each being the half of the note size
       *   - If the note is on the right of the actor, we should define the current actor
       *     margin
       */
      if (isMessage && msg.from === nextActorId) {
        maxMessageWidthPerActor[msg.to] = Math.max(maxMessageWidthPerActor[msg.to] || 0, messageWidth)
      } else if (isMessage && msg.from === prevActorId) {
        maxMessageWidthPerActor[msg.from] = Math.max(maxMessageWidthPerActor[msg.from] || 0, messageWidth)
      } else if (isMessage && msg.from === msg.to) {
        maxMessageWidthPerActor[msg.from] = Math.max(maxMessageWidthPerActor[msg.from] || 0, messageWidth / 2)

        maxMessageWidthPerActor[msg.to] = Math.max(maxMessageWidthPerActor[msg.to] || 0, messageWidth / 2)
      } else if (msg.placement === PLACEMENT.RIGHTOF) {
        maxMessageWidthPerActor[msg.from] = Math.max(maxMessageWidthPerActor[msg.from] || 0, messageWidth)
      } else if (msg.placement === PLACEMENT.LEFTOF) {
        maxMessageWidthPerActor[prevActorId] = Math.max(maxMessageWidthPerActor[prevActorId] || 0, messageWidth)
      } else if (msg.placement === PLACEMENT.OVER) {
        if (prevActorId) {
          maxMessageWidthPerActor[prevActorId] = Math.max(maxMessageWidthPerActor[prevActorId] || 0, messageWidth / 2)
        }

        if (nextActorId) {
          maxMessageWidthPerActor[msg.from] = Math.max(maxMessageWidthPerActor[msg.from] || 0, messageWidth / 2)
        }
      }
    }
  })

  logger.debug('maxMessageWidthPerActor:', maxMessageWidthPerActor)
  return maxMessageWidthPerActor
}

const calculateLoopBounds = function (messages, actors) {
  const loops = {}
  const stack = []
  let current, noteModel, msgModel

  messages.forEach(function (msg) {
    msg.id = utils.makeid(10)
    switch (msg.type) {
      case LINETYPE.LOOP_START:
      case LINETYPE.ALT_START:
      case LINETYPE.OPT_START:
      case LINETYPE.PAR_START:
        stack.push({
          id: msg.id,
          msg: msg.message,
          from: Number.MAX_SAFE_INTEGER,
          to: Number.MIN_SAFE_INTEGER,
          width: 0,
        })
        break
      case LINETYPE.ALT_ELSE:
      case LINETYPE.PAR_AND:
        if (msg.message) {
          current = stack.pop()
          loops[current.id] = current
          loops[msg.id] = current
          stack.push(current)
        }
        break
      case LINETYPE.LOOP_END:
      case LINETYPE.ALT_END:
      case LINETYPE.OPT_END:
      case LINETYPE.PAR_END:
        current = stack.pop()
        loops[current.id] = current
        break
      case LINETYPE.ACTIVE_START:
        {
          const actorRect = actors[msg.from ? msg.from.actor : msg.to.actor]
          const stackedSize = actorActivations(msg.from ? msg.from.actor : msg.to.actor).length
          const x = actorRect.x + actorRect.width / 2 + ((stackedSize - 1) * conf.activationWidth) / 2
          const toAdd = {
            startx: x,
            stopx: x + conf.activationWidth,
            actor: msg.from.actor,
            enabled: true,
          }
          model.activations.push(toAdd)
        }
        break
      case LINETYPE.ACTIVE_END:
        {
          const lastActorActivationIdx = model.activations.map(a => a.actor).lastIndexOf(msg.from.actor)
          delete model.activations.splice(lastActorActivationIdx, 1)[0]
        }
        break
    }
    const isNote = msg.placement !== undefined
    if (isNote) {
      noteModel = buildNoteModel(msg, actors)
      msg.noteModel = noteModel
      stack.forEach(stk => {
        current = stk
        current.from = Math.min(current.from, noteModel.startx)
        current.to = Math.max(current.to, noteModel.startx + noteModel.width)
        current.width = Math.max(current.width, Math.abs(current.from - current.to)) - conf.labelBoxWidth
      })
    } else {
      msgModel = buildMessageModel(msg, actors)
      msg.msgModel = msgModel
      if (msgModel.startx && msgModel.stopx && stack.length > 0) {
        stack.forEach(stk => {
          current = stk
          if (msgModel.startx === msgModel.stopx) {
            let from = actors[msg.from]
            let to = actors[msg.to]
            current.from = Math.min(from.x - msgModel.width / 2, from.x - from.width / 2, current.from)
            current.to = Math.max(to.x + msgModel.width / 2, to.x + from.width / 2, current.to)
            current.width = Math.max(current.width, Math.abs(current.to - current.from)) - conf.labelBoxWidth
          } else {
            current.from = Math.min(msgModel.startx, current.from)
            current.to = Math.max(msgModel.stopx, current.to)
            current.width = Math.max(current.width, msgModel.width) - conf.labelBoxWidth
          }
        })
      }
    }
  })
  model.activations = []
  log.debug('Loop type widths:', loops)
  return loops
}

export default sequenceArtist
