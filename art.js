(_ => {
  const outCanvas = document.getElementsByTagName('canvas')[0]
  const canvas = new OffscreenCanvas(outCanvas.width, outCanvas.height)
  let ctx = canvas.getContext('2d')
  ctx.translate(0.5, 0.5)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const menus = document.getElementsByTagName('menu')
  const menu = menus[0]
  const canvasMenu = menus[1]
  const buttons = menu.getElementsByTagName('button')
  const toolInputs = document.querySelectorAll('input[type="radio"]')
  const colorInput = document.querySelector('input[type="color"]')
  const pencilInput = menu.querySelector('input[type="range"]')
  const sizeInput = menu.querySelector('input[type="number"]')
  const currentCount = document.querySelector('#current')
  const sizeInputs = canvasMenu.querySelectorAll('input[type="number"]')
  const copyButton = document.querySelector('#copy')
  const versionCheckbox = document.querySelector('#version')
  
  let version = versionCheckbox.checked ? 2 : 1
  let zoom = 4
  
  let currentAction = 'color'
  ;[...buttons].forEach(button => {
    button.addEventListener('click', (e) => {
      const action = e.currentTarget.textContent.toLowerCase()
      switch (action) {
        case 'clear':
          resizeCanvas(canvas.width, canvas.height)
          window.location.hash = ''
          updateCount()
          break
      }
    })
  })
  ;[...toolInputs].forEach(input => {
    if (input.checked) currentAction = input.value
    input.addEventListener('change', (e) => {
      if (e.currentTarget.checked) {
        currentAction = e.currentTarget.value
      }
    })
  })
  pencilInput.addEventListener('input', (e) => {
    sizeInput.value = e.currentTarget.value
  })
  sizeInput.addEventListener('input', (e) => {
    pencilInput.value = e.currentTarget.value
  })
  sizeInputs[0].addEventListener('input', (e) => {
    resizeCanvas(e.currentTarget.value, canvas.height)
    updateRLE(version)
  })
  sizeInputs[1].addEventListener('input', (e) => {
    resizeCanvas(canvas.width, e.currentTarget.value)
    updateRLE(version)
  })
  sizeInputs[2].addEventListener('input', (e) => {
    zoom = e.currentTarget.value
    canvasDraw()
  })
  copyButton.addEventListener('click', (e) => {
    let urlPath = window.location.host + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') ) + window.location.hash
    navigator.clipboard.writeText(urlPath)
  })
  versionCheckbox.addEventListener('change', (e) => {
    version = e.currentTarget.checked ? 2 : 1
    updateRLE(version)
  })
  
  let currX = 0
  let currY = 0
  let lastX = 0
  let lastY = 0
  const colorAt = ({idat, x, y}) => {
    const r = idat.data[(y * canvas.width + x) * 4]
    const g = idat.data[(y * canvas.width + x) * 4 + 1]
    const b = idat.data[(y * canvas.width + x) * 4 + 2]
    const a = idat.data[(y * canvas.width + x) * 4 + 3]
    return {r, g, b, a}
  }
  const colorSame = (a, b) => {
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a
  }
  const colorInputToRGBA = (color) => {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    const a = parseInt(color.slice(7, 9), 16) || 255
    return {r, g, b, a}
  }
  const setPixel = ({idat, x, y, r, g, b, a}) => {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return
    idat.data[(y * canvas.width + x) * 4] = r
    idat.data[(y * canvas.width + x) * 4 + 1] = g
    idat.data[(y * canvas.width + x) * 4 + 2] = b
    idat.data[(y * canvas.width + x) * 4 + 3] = a
  }
  const inBounds = ({x, y}) => {
    return x >= 0 && x < canvas.width && y >= 0 && y < canvas.height
  }

  const floodAt = ({idat, x, y, r, g, b, a, tr, tg, tb, ta}) => {
    const stack = [{x, y}]
    while (stack.length) {
      let {x, y} = stack.pop()
      
      if (!inBounds({x, y})) continue
      if (!colorSame(colorAt({idat, x, y}), {r: tr, g: tg, b: tb, a: ta})) continue
      if (colorSame(colorAt({idat, x, y}), {r: r, g: g, b: b, a: a})) continue

      setPixel({idat, x, y, r, g, b, a})
      
      stack.push({x: x - 1, y})
      stack.push({x: x + 1, y})
      stack.push({x, y: y - 1})
      stack.push({x, y: y + 1})
    }
  }
  const circleAt = ({idat, x, y, rad, r, g, b, a}) => {
    // This has got to be one of the dumbest things I've written, but it's lazier to just swap even and odd sizings to give nicer end results. I'm sure the circle algo could be rewritten to be smarter, but oh well!
    let hasFloat = rad % 1 !== 0
    if (!hasFloat) {
      rad += 0.5
    } else {
      rad -= 0.5
    }
    for (let dx = -rad; dx <= rad; dx++) {
      for (let dy = -rad; dy <= rad; dy++) {
        if (dx*dx + dy*dy <= rad*rad) {
          setPixel({idat, x: Math.round(x + dx), y: Math.round(y + dy), r, g, b, a})
        }
      }
    }
  }
  
  const resizeCanvas = (width, height) => {
    canvas.width = width
    canvas.height = height
    ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.translate(0.5, 0.5)
    canvasDraw()
  }
  const canvasDraw = () => {
    if (outCanvas.width !== canvas.width * zoom || outCanvas.height !== canvas.height * zoom) {
      outCanvas.width = canvas.width * zoom
      outCanvas.height = canvas.height * zoom
    }
    let octx = outCanvas.getContext('2d')
    octx.imageSmoothingEnabled = false
    octx.drawImage(canvas, 0, 0, canvas.width * zoom, canvas.height * zoom)
  }
  const canvasAct = ({x, y, action}) => {
    switch (action) {
      case 'pencil': {
        const {r, g, b, a} = colorInputToRGBA(colorInput.value)
        const idat = ctx.getImageData(0, 0, canvas.width, canvas.height)
        if (pencilInput.value == 1) {
          setPixel({idat, x, y, r, g, b, a})
        } else {
          let rad = pencilInput.value / 2
          circleAt({idat, x, y, rad: rad, r, g, b, a})
        }
        ctx.putImageData(idat, 0, 0)
      } break
      case 'eraser': {
        const r = 255
        const g = 255
        const b = 255
        const a = 255
        const idat = ctx.getImageData(0, 0, canvas.width, canvas.height)
        if (pencilInput.value == 1) {
          setPixel({idat, x, y, r, g, b, a})
        } else {
          let rad = pencilInput.value / 2
          circleAt({idat, x, y, rad: rad, r, g, b, a})
        }
        ctx.putImageData(idat, 0, 0)
      } break
      case 'fill':
        const idat = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const { r, g, b, a } = colorInputToRGBA(colorInput.value)
        const {r: tr, g: tg, b: tb, a: ta} = colorAt({idat, x, y})
        floodAt({idat, x, y, r, g, b, a, tr, tg, tb, ta})
        ctx.putImageData(idat, 0, 0)
        break
    }
    canvasDraw()
  }
  const canvasMouse = (e) => {
    const x = Math.floor((e.clientX - outCanvas.offsetLeft) / zoom)
    const y = Math.floor((e.clientY - outCanvas.offsetTop) / zoom)
    currX = x
    currY = y
    return { x, y }
  }
  const pointerDown = (e) => {
    e.preventDefault()
    canvasAct({...canvasMouse(e), action: currentAction})
    lastX = currX
    lastY = currY
    window.addEventListener('pointermove', pointerMove)
    window.addEventListener('pointerup', pointerUp)
    outCanvas.setPointerCapture(e.pointerId)
  }
  const pointerMove = (e) => {
    e.preventDefault()
    const {x, y} = canvasMouse(e)
    let dx = lastX - x
    let dy = lastY - y
    lastX = currX
    lastY = currY

    let angle = Math.atan2(dy, dx)
    let dist = Math.sqrt(dx*dx + dy*dy)
    let steps = Math.ceil(dist)
    for (let i = 0; i < steps; i++) {
      let x = Math.floor(lastX + Math.cos(angle) * i)
      let y = Math.floor(lastY + Math.sin(angle) * i)
      canvasAct({x, y, action: currentAction})
    }
  }
  const pointerUp = (e) => {
    e.preventDefault()
    outCanvas.releasePointerCapture(e.pointerId)
    updateRLE(version)
    window.removeEventListener('pointermove', pointerMove)
    window.removeEventListener('pointerup', pointerUp)
  }
  
  const updateCount = () => {
    let urlPath = window.location.host + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') ) + window.location.hash
    currentCount.textContent = urlPath.length
  }
  
  const updateRLE = async (version) => {
    const idat = ctx.getImageData(0, 0, canvas.width, canvas.height)
    // color palette
    let colors = [] // rgb stored as [..., r,g,b]
    const getPaletteIndex = (r, g, b) => {
      for (let i = 0; i < colors.length; i += 3) {
        if (colors[i] === r && colors[i + 1] === g && colors[i + 2] === b) {
          return i / 3
        }
      }
      return -1
    }
    const getAs16Bit = (n) => {
      let high = Math.floor(n / 256)
      let low = n % 256
      return [high, low]
    }
    for (let i = 0; i < idat.data.length; i += 4) {
      let r = idat.data[i]
      let g = idat.data[i + 1]
      let b = idat.data[i + 2]
      if (getPaletteIndex(r, g, b) === -1) {
        colors.push(r, g, b)
      }
    }
    // Get palette count as a 16-bit number if version 1, or 8-bit if version 2.
    let colorCount = colors.length / 3
    let colorCountArray = [[]]
    if (version === 1) {
      colorCountArray = getAs16Bit(colorCount)
    } else {
      colorCountArray = [colorCount]
    }

    let rle = []
    let lastColor = [255,255,255]
    let count = 0
    const pushCount = (r, g, b) => {
      let countArray = []
      let indexArray = []
      let index = getPaletteIndex(lastColor[0], lastColor[1], lastColor[2])
      if (version !== 1) {
        countArray = [count-1]
        indexArray = [index]
      } else {
        countArray = getAs16Bit(count-1)
        indexArray = getAs16Bit(index)
      }
      rle.push(...countArray, ...indexArray)
      count = 1
      lastColor = [r, g, b]
    }
    for (let i = 0; i < idat.data.length; i += 4) {
      let r = idat.data[i]
      let g = idat.data[i + 1]
      let b = idat.data[i + 2]
      if (count >= 256) {
        pushCount(r, g, b)
        continue
      }
      if (r === lastColor[0] && g === lastColor[1] && b === lastColor[2]) {
        count++
      } else {
        pushCount(r, g, b)
      }
    }
    if (count > 1) {
      pushCount(lastColor[0], lastColor[1], lastColor[2])
    }

    async function bytesToBase64DataUrl(bytes, type = "application/octet-stream") {
      return await new Promise((resolve, reject) => {
        const reader = Object.assign(new FileReader(), {
          onload: () => resolve(reader.result),
          onerror: () => reject(reader.error),
        });
        reader.readAsDataURL(new File([bytes], "", { type }));
      });
    }
    
    let bytes = Uint8Array.from([canvas.width-1, canvas.height-1, ...colorCountArray, ...colors, ...rle])
    let b64 = (await bytesToBase64DataUrl(bytes)).slice('data:application/octet-stream;base64,'.length)
    
    window.location.hash = b64 + (version === 1 ? '1' : '')
    updateCount()
  }
  
  const loadRLE = (rle, version) => {
    ctx = canvas.getContext('2d')
    console.log(version, rle)
    let rleArr = [...Uint8Array.from(atob(rle), m=>m.codePointAt(0))]

    canvas.width = rleArr.shift() + 1
    canvas.height = rleArr.shift() + 1
    
    let colors = 0
    let palette = []
    
    if (version === 1) {
      colors = rleArr.shift() * 256 + rleArr.shift()
    } else {
      colors = rleArr.shift()
    }
    palette = rleArr.splice(0, colors * 3)

    let idat = ctx.createImageData(canvas.width, canvas.height)
    let i = 0
    let x = 0
    let y = 0
    while (rleArr.length) {
      let count = 0
      let color = 0
      if (version === 1) {
        count = rleArr.shift() * 256 + rleArr.shift() + 1
        color = rleArr.shift() * 256 + rleArr.shift() * 3
      } else {
        count = rleArr.shift() + 1
        color = rleArr.shift() * 3
      }
      let r = palette[color]
      let g = palette[color + 1]
      let b = palette[color + 2]
      for (let c = 0; c < count; c++) {
        idat.data[i++] = r
        idat.data[i++] = g
        idat.data[i++] = b
        idat.data[i++] = 255
        x++
        if (x >= canvas.width) {
          x = 0
          y++
        }
      }
    }
    while (i < idat.data.length) {
      idat.data[i++] = 255
    }
    ctx.putImageData(idat, 0, 0)
    canvasDraw()
  }

  resizeCanvas(sizeInputs[0].value, sizeInputs[1].value)
  
  let hash = window.location.hash
  if (hash !== '') {
    if (hash.endsWith('1')) {
      version = 1
      hash = hash.slice(0, -1)
    } else {
      version = 2
    }
    versionCheckbox.checked = version !== 1
    loadRLE(hash.slice(1), version)
    sizeInputs[0].value = canvas.width
    sizeInputs[1].value = canvas.height
  }
  updateCount()
  zoom = sizeInputs[2].value

  outCanvas.addEventListener('pointerdown', pointerDown)
})()