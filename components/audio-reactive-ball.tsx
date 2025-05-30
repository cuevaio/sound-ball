"use client"

import { useEffect, useRef, useState } from "react"

export default function Component() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const asciiRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const audioContextRef = useRef<AudioContext | undefined>(undefined)
  const analyserRef = useRef<AnalyserNode | undefined>(undefined)
  const dataArrayRef = useRef<Uint8Array | undefined>(undefined)
  const audioRef = useRef<HTMLAudioElement | undefined>(undefined)
  const sourceRef = useRef<MediaElementAudioSourceNode | undefined>(undefined)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)
  const [text, setText] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  // ASCII characters from darkest to lightest
  const asciiChars = " .:-=+*#%@"

  // Ball properties
  const ballRef = useRef({
    x: 0,
    y: 0,
    baseRadius: 100,
    currentRadius: 100,
    targetRadius: 100,
    hue: 200,
    targetHue: 200,
    particles: [] as Array<{
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
      size: number
    }>,
  })

  const addParticles = (intensity: number, canvas: HTMLCanvasElement) => {
    const ball = ballRef.current
    const particleCount = Math.floor(intensity * 5)

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 4
      ball.particles.push({
        x: ball.x + Math.cos(angle) * ball.currentRadius,
        y: ball.y + Math.sin(angle) * ball.currentRadius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 60,
        maxLife: 60,
        size: 2 + Math.random() * 3,
      })
    }

    if (ball.particles.length > 200) {
      ball.particles.splice(0, ball.particles.length - 200)
    }
  }

  const convertToAscii = () => {
    const canvas = canvasRef.current
    const asciiDiv = asciiRef.current
    if (!canvas || !asciiDiv) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Check if canvas has valid dimensions
    if (canvas.width <= 0 || canvas.height <= 0) return

    // ASCII grid dimensions - adjusted for better aspect ratio
    const charWidth = 3 // Increased from 3 to make characters less wide
    const charHeight = 6
    const cols = Math.floor(canvas.width / charWidth)
    const rows = Math.floor(canvas.height / charHeight)

    // Ensure we have valid grid dimensions
    if (cols <= 0 || rows <= 0) return

    // Get image data with error handling
    let imageData
    try {
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    } catch (error) {
      console.warn("Failed to get image data:", error)
      return
    }

    const pixels = imageData.data

    let asciiString = ""

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Sample pixel from the center of each character cell
        const pixelX = Math.floor(x * charWidth + charWidth / 2)
        const pixelY = Math.floor(y * charHeight + charHeight / 2)

        // Ensure pixel coordinates are within bounds
        if (pixelX >= canvas.width || pixelY >= canvas.height) {
          asciiString += " "
          continue
        }

        const pixelIndex = (pixelY * canvas.width + pixelX) * 4

        // Ensure pixel index is within bounds
        if (pixelIndex >= pixels.length) {
          asciiString += " "
          continue
        }

        // Calculate brightness (0-255)
        const r = pixels[pixelIndex] || 0
        const g = pixels[pixelIndex + 1] || 0
        const b = pixels[pixelIndex + 2] || 0
        const brightness = (r + g + b) / 3

        // Map brightness to ASCII character
        const charIndex = Math.floor((brightness / 255) * (asciiChars.length - 1))
        asciiString += asciiChars[charIndex]
      }
      asciiString += "\n"
    }

    // Update ASCII display
    asciiDiv.textContent = asciiString
  }

  const animate = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Check if canvas has valid dimensions before proceeding
    if (canvas.width <= 0 || canvas.height <= 0) {
      animationRef.current = requestAnimationFrame(animate)
      return
    }

    const ball = ballRef.current

    // Clear canvas
    ctx.fillStyle = "rgba(0, 0, 0, 1)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Analyze audio if available
    let volume = 0
    let dominantFreq = 0

    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current)

      // Calculate volume from frequency data
      const sum = dataArrayRef.current.reduce((a, b) => a + b, 0)
      volume = sum / dataArrayRef.current.length / 255

      // Boost volume for better visualization
      volume = Math.min(1, volume * 10) // Increased boost for better visibility

      // Find dominant frequency
      let maxAmplitude = 0
      let maxIndex = 0
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        if (dataArrayRef.current[i] > maxAmplitude) {
          maxAmplitude = dataArrayRef.current[i]
          maxIndex = i
        }
      }
      dominantFreq = maxIndex / dataArrayRef.current.length

      // Update ball properties based on audio
      ball.targetRadius = ball.baseRadius + volume * 150 // Increased radius change
      ball.targetHue = 200 + dominantFreq * 160

      // Create particles based on volume
      const particleThreshold = 0.05
      if (volume > particleThreshold) {
        addParticles(volume, canvas)
      }
    } else {
      // Subtle idle animation when no audio
      const time = Date.now() / 1000
      const pulseFactor = Math.sin(time) * 0.1 + 0.9
      ball.targetRadius = ball.baseRadius * pulseFactor
    }

    // Smooth transitions
    ball.currentRadius += (ball.targetRadius - ball.currentRadius) * 0.1
    ball.hue += (ball.targetHue - ball.hue) * 0.1

    // Update ball position
    ball.x = canvas.width / 2
    ball.y = canvas.height / 2

    // Draw ball with grayscale gradient
    const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.currentRadius)
    gradient.addColorStop(0, `rgba(255, 255, 255, 1)`)
    gradient.addColorStop(0.7, `rgba(180, 180, 180, 0.8)`)
    gradient.addColorStop(1, `rgba(80, 80, 80, 0.2)`)

    // Enhanced glow for better ASCII visibility
    ctx.shadowColor = `rgba(255, 255, 255, 0.8)`
    ctx.shadowBlur = 30
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.currentRadius, 0, Math.PI * 2)
    ctx.fill()

    // Brighter inner core
    ctx.shadowBlur = 0
    const coreGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.currentRadius * 0.3)
    coreGradient.addColorStop(0, `rgba(255, 255, 255, 1)`)
    coreGradient.addColorStop(1, `rgba(255, 255, 255, 0.3)`)

    ctx.fillStyle = coreGradient
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.currentRadius * 0.3, 0, Math.PI * 2)
    ctx.fill()

    // Draw particles with grayscale
    ball.particles.forEach((particle, index) => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.life--

      const alpha = particle.life / particle.maxLife
      ctx.fillStyle = `rgba(220, 220, 220, ${alpha})`
      ctx.shadowColor = `rgba(255, 255, 255, ${alpha})`
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2)
      ctx.fill()

      if (particle.life <= 0) {
        ball.particles.splice(index, 1)
      }
    })

    // Draw enhanced frequency bars in grayscale
    if (analyserRef.current && dataArrayRef.current) {
      const barCount = 32
      const angleStep = (Math.PI * 2) / barCount

      for (let i = 0; i < barCount; i++) {
        const angle = i * angleStep

        // Get amplitude with boost
        let amplitude = dataArrayRef.current[i * 4] / 255
        amplitude = Math.min(1, amplitude * 5) // Increased boost for TTS

        const barLength = amplitude * 80 // Increased bar length

        const startX = ball.x + Math.cos(angle) * (ball.currentRadius + 10)
        const startY = ball.y + Math.sin(angle) * (ball.currentRadius + 10)
        const endX = ball.x + Math.cos(angle) * (ball.currentRadius + 10 + barLength)
        const endY = ball.y + Math.sin(angle) * (ball.currentRadius + 10 + barLength)

        const grayValue = Math.floor(200 * amplitude)
        ctx.strokeStyle = `rgba(${grayValue}, ${grayValue}, ${grayValue}, ${amplitude * 1.5})`
        ctx.lineWidth = 3
        ctx.shadowColor = `rgba(255, 255, 255, ${amplitude})`
        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()
      }
    }

    ctx.shadowBlur = 0

    // Convert to ASCII
    convertToAscii()

    animationRef.current = requestAnimationFrame(animate)
  }

  const initAudio = () => {
    try {
      // Create audio context with high sample rate for better quality
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 48000,
      })

      // Create analyzer with optimized settings for TTS
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 1024 // Increased for better frequency resolution
      analyser.smoothingTimeConstant = 0.85 // Smoother transitions
      analyser.minDecibels = -90 // Lower threshold for better sensitivity
      analyser.maxDecibels = -10 // Higher threshold for better range

      // Store references
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)

      console.log("Audio context initialized for TTS visualization")
    } catch (err) {
      console.error("Error initializing audio context:", err)
    }
  }

  const handleTextToSpeech = async () => {
    if (!text.trim() || isGenerating) return

    setIsGenerating(true)
    try {
      // Initialize audio context if not already done
      if (!audioContextRef.current) {
        initAudio()
      }

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController()

      // Fetch the streaming audio
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to generate speech')
      }

      // Get the audio data as a blob
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Create audio element
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      // Create audio source and connect to analyzer
      if (!audioContextRef.current || !analyserRef.current) {
        throw new Error('Audio context not initialized')
      }

      // Disconnect any existing connections
      if (sourceRef.current) {
        sourceRef.current.disconnect()
      }

      // Create new source and connect it
      const source = audioContextRef.current.createMediaElementSource(audio)
      sourceRef.current = source

      // Connect the audio graph
      source.connect(analyserRef.current)
      analyserRef.current.connect(audioContextRef.current.destination)

      // Add gain node for better visualization
      const gainNode = audioContextRef.current.createGain()
      gainNode.gain.value = 2.0 // Boost the signal for better visualization
      source.connect(gainNode)
      gainNode.connect(analyserRef.current)

      // Start playing the audio
      try {
        await audio.play()
        console.log('Audio playback started')
      } catch (playError) {
        console.error('Error playing audio:', playError)
        throw playError
      }

      // Clean up when audio ends
      audio.onended = () => {
        console.log('Audio playback ended')
        URL.revokeObjectURL(audioUrl) // Clean up the URL
        setIsGenerating(false)
        abortControllerRef.current = undefined
        audioRef.current = undefined
        if (sourceRef.current) {
          sourceRef.current.disconnect()
          sourceRef.current = undefined
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Speech generation cancelled')
      } else {
        console.error('Error generating speech:', error)
      }
      setIsGenerating(false)
      abortControllerRef.current = undefined
      audioRef.current = undefined
      if (sourceRef.current) {
        sourceRef.current.disconnect()
        sourceRef.current = undefined
      }
    }
  }

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = undefined
    }
    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = undefined
    }
    setIsGenerating(false)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Initialize audio context
    initAudio()

    // Add a small delay to ensure canvas is properly sized before starting animation
    setTimeout(() => {
      animate()
    }, 100)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black">
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          className="flex-1 p-2 rounded bg-black/50 text-white border border-white/20 focus:border-white/50 outline-none resize-none"
          rows={3}
        />
        <div className="flex gap-2">
          <button
            onClick={handleTextToSpeech}
            disabled={isGenerating || !text.trim()}
            className="px-4 py-2 rounded bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Speech'}
          </button>
          {isGenerating && (
            <button
              onClick={cancelGeneration}
              className="px-4 py-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="w-full h-full opacity-0" />
      <div
        ref={asciiRef}
        className="fixed inset-0 font-mono text-white whitespace-pre overflow-hidden pointer-events-none flex items-center justify-center"
        style={{
          fontSize: "5px",
          lineHeight: "5px",
          letterSpacing: "-0.5px",
        }}
      />
    </div>
  )
}
