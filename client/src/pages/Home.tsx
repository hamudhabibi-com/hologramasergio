import { useState, useRef, useEffect } from "react";
import { Upload, Maximize2, Play, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Design Philosophy: Minimalist Hologram Interface
 * - Dark background (black) for authentic hologram projection aesthetic
 * - Clean, modern typography for clarity
 * - Smooth transitions and animations
 * - Focus on the media display as the primary element
 */

type MediaType = "video" | "image" | "gif" | null;

export default function Home() {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Determine media type from file
  const getMediaType = (file: File): MediaType => {
    const type = file.type;
    if (type.startsWith("video/")) return "video";
    if (type === "image/gif") return "gif";
    if (type.startsWith("image/")) return "image";
    return null;
  };

  // Converter GIF para MP4 usando canvas e MediaRecorder
  const convertGifToMp4 = async (gifFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(gifFile);
      video.muted = true;
      
      video.onloadedmetadata = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Nao foi possivel obter contexto do canvas');

          const stream = canvas.captureStream(30);
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
          });

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          mediaRecorder.onstop = () => {
            const videoBlob = new Blob(chunks, { type: 'video/webm' });
            resolve(videoBlob);
          };

          mediaRecorder.start();
          video.play();

          video.onended = () => {
            mediaRecorder.stop();
          };
        } catch (error) {
          reject(error);
        }
      };
      
      video.onerror = () => reject(new Error('Nao foi possivel carregar o GIF'));
    });
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = getMediaType(file);
      if (type) {
        setMediaFile(file);
        
        // Se for GIF, converter para MP4
        if (type === 'gif') {
          try {
            const videoBlob = await convertGifToMp4(file);
            const url = URL.createObjectURL(videoBlob);
            setMediaUrl(url);
            setMediaType('video'); // Tratar como vídeo após conversão
            setIsPlaying(true);
          } catch (error) {
            console.error('Erro ao converter GIF:', error);
            // Fallback: usar GIF original se conversão falhar
            const url = URL.createObjectURL(file);
            setMediaUrl(url);
            setMediaType(type);
            setIsPlaying(true);
          }
        } else {
          const url = URL.createObjectURL(file);
          setMediaUrl(url);
          setMediaType(type);
          setIsPlaying(true);
        }
      }
    }
  };

  // Toggle fullscreen mode (using CSS fullscreen, not browser fullscreen)
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Render canvas frame with 4 rotated copies
  const renderCanvasFrame = (
    canvas: HTMLCanvasElement,
    sourceElement: HTMLVideoElement | HTMLImageElement,
    sourceWidth: number,
    sourceHeight: number
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasSize = Math.min(canvas.width, canvas.height);
    const quadrantSize = canvasSize / 2;

    // Clear canvas with black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate crop dimensions (square)
    const minDim = Math.min(sourceWidth, sourceHeight);
    const cropX = (sourceWidth - minDim) / 2;
    const cropY = (sourceHeight - minDim) / 2;

    // Draw 4 rotated copies
    const positions = [
      { x: quadrantSize / 2, y: quadrantSize / 2, rotation: 0 }, // Top
      { x: quadrantSize + quadrantSize / 2, y: quadrantSize / 2, rotation: Math.PI / 2 }, // Right
      { x: quadrantSize + quadrantSize / 2, y: quadrantSize + quadrantSize / 2, rotation: Math.PI }, // Bottom
      { x: quadrantSize / 2, y: quadrantSize + quadrantSize / 2, rotation: (3 * Math.PI) / 2 }, // Left
    ];

    positions.forEach((pos) => {
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(pos.rotation);
      ctx.scale(-1, 1); // Flip horizontally
      ctx.drawImage(
        sourceElement,
        cropX,
        cropY,
        minDim,
        minDim,
        -quadrantSize / 2,
        -quadrantSize / 2,
        quadrantSize,
        quadrantSize
      );
      ctx.restore();
    });
  };

  // Render preview canvas
  useEffect(() => {
    if (!canvasRef.current || !mediaUrl) return;

    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;

    const renderFrame = () => {
      let sourceElement: HTMLVideoElement | HTMLImageElement | null = null;
      let sourceWidth = 0;
      let sourceHeight = 0;

      if (mediaType === "video" || mediaType === "gif") {
        sourceElement = videoRef.current;
        if (!sourceElement) {
          if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(renderFrame);
          }
          return;
        }
        // Para GIFs e vídeos, aguardar até que os metadados estejam carregados
        if (sourceElement.videoWidth === 0 || sourceElement.videoHeight === 0) {
          if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(renderFrame);
          }
          return;
        }
        sourceWidth = sourceElement.videoWidth;
        sourceHeight = sourceElement.videoHeight;
      } else if (mediaType === "image") {
        sourceElement = imageRef.current;
        if (!sourceElement || sourceElement.naturalWidth === 0) {
          if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(renderFrame);
          }
          return;
        }
        sourceWidth = sourceElement.naturalWidth;
        sourceHeight = sourceElement.naturalHeight;
      }

      if (sourceElement) {
        renderCanvasFrame(canvas, sourceElement, sourceWidth, sourceHeight);
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
      }
    };

    if (mediaType === "video" || mediaType === "gif") {
      const video = videoRef.current;
      if (video) {
        video.addEventListener("play", renderFrame);
        video.addEventListener("playing", renderFrame);
        video.addEventListener("loadedmetadata", renderFrame);
      }

      if (isPlaying) {
        // Tentar reproduzir imediatamente
        if (video && video.readyState >= 2) {
          // Metadados já carregados
          renderFrame();
        } else if (video) {
          // Aguardar carregamento dos metadados
          const handleLoadedMetadata = () => {
            renderFrame();
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
          };
          video.addEventListener("loadedmetadata", handleLoadedMetadata);
        }
      }

      return () => {
        if (video) {
          video.removeEventListener("play", renderFrame);
          video.removeEventListener("playing", renderFrame);
          video.removeEventListener("loadedmetadata", renderFrame);
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else if (mediaType === "image") {
      const image = imageRef.current;
      if (image) {
        if (image.complete) {
          renderFrame();
        } else {
          image.addEventListener("load", renderFrame);
        }
      }

      return () => {
        if (image) {
          image.removeEventListener("load", renderFrame);
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [mediaUrl, mediaType, isPlaying]);

  // Render fullscreen canvas
  useEffect(() => {
    if (!isFullscreen || !fullscreenCanvasRef.current || !mediaUrl) return;

    const canvas = fullscreenCanvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const renderFrame = () => {
      let sourceElement: HTMLVideoElement | HTMLImageElement | null = null;
      let sourceWidth = 0;
      let sourceHeight = 0;

      if (mediaType === "video" || mediaType === "gif") {
        sourceElement = videoRef.current;
        if (!sourceElement) {
          if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(renderFrame);
          }
          return;
        }
        // Para GIFs e vídeos, aguardar até que os metadados estejam carregados
        if (sourceElement.videoWidth === 0 || sourceElement.videoHeight === 0) {
          if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(renderFrame);
          }
          return;
        }
        sourceWidth = sourceElement.videoWidth;
        sourceHeight = sourceElement.videoHeight;
      } else if (mediaType === "image") {
        sourceElement = imageRef.current;
        if (!sourceElement || sourceElement.naturalWidth === 0) {
          if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(renderFrame);
          }
          return;
        }
        sourceWidth = sourceElement.naturalWidth;
        sourceHeight = sourceElement.naturalHeight;
      }

      if (sourceElement) {
        renderCanvasFrame(canvas, sourceElement, sourceWidth, sourceHeight);
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
      }
    };

    if (isPlaying) {
      renderFrame();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isFullscreen, mediaUrl, mediaType, isPlaying]);

  useEffect(() => {
    const handleResize = () => {
      if (isFullscreen && fullscreenCanvasRef.current) {
        fullscreenCanvasRef.current.width = window.innerWidth;
        fullscreenCanvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFullscreen]);

  if (isFullscreen && mediaUrl) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden">
        <canvas
          ref={fullscreenCanvasRef}
          className="w-full h-full block"
          style={{ maxWidth: "100vw", maxHeight: "100vh" }}
        />
        {(mediaType === "video" || mediaType === "gif") && (
          <video
            ref={videoRef}
            src={mediaUrl}
            loop
            muted
            playsInline
            className="hidden"
            autoPlay
            onLoadedMetadata={() => {
              if (videoRef.current && isPlaying) {
                videoRef.current.play().catch(() => {});
              }
            }}
          />
        )}
        {mediaType === "image" && (
          <img ref={imageRef} src={mediaUrl} className="hidden" />
        )}

        {/* Fullscreen controls overlay */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4 z-50">
          {(mediaType === "video" || mediaType === "gif") && (
            <Button
              onClick={togglePlayPause}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Reproduzir
                </>
              )}
            </Button>
          )}
          <Button
            onClick={toggleFullscreen}
            className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all"
          >
            <X className="w-5 h-5 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const getMediaTypeLabel = () => {
    switch (mediaType) {
      case "video":
        return "Vídeo";
      case "gif":
        return "GIF";
      case "image":
        return "Imagem";
      default:
        return "Mídia";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
              <Maximize2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Hologram Video Projector
              </h1>
              <p className="text-sm text-slate-400">
                Transforme seus vídeos, GIFs e imagens para projetores de
                holograma caseiros
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-6xl mx-auto px-4 py-12">
        {mediaUrl ? (
          <div className="space-y-8">
            {/* Preview Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Pré-visualização - {getMediaTypeLabel()}
              </h2>
              <div className="bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl w-full max-w-lg mx-auto">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto block"
                  style={{ aspectRatio: "1" }}
                />
                {(mediaType === "video" || mediaType === "gif") && (
                  <video
                    ref={videoRef}
                    src={mediaUrl}
                    loop
                    muted
                    playsInline
                    className="hidden"
                    autoPlay
                    onLoadedMetadata={() => {
                      if (videoRef.current && isPlaying) {
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                  />
                )}
                {mediaType === "image" && (
                  <img ref={imageRef} src={mediaUrl} className="hidden" />
                )}
              </div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row gap-4">
              {(mediaType === "video" || mediaType === "gif") && (
                <Button
                  onClick={togglePlayPause}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-6 rounded-lg transition-all"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Reproduzir
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={toggleFullscreen}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-6 rounded-lg transition-all"
              >
                <Maximize2 className="w-5 h-5 mr-2" />
                Tela Cheia
              </Button>
              <Button
                onClick={() => {
                  setMediaUrl("");
                  setMediaType(null);
                  setMediaFile(null);
                  setIsPlaying(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-6 rounded-lg transition-all"
              >
                <Upload className="w-5 h-5 mr-2" />
                Enviar Outro
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-md">
              <div
                className="border-2 border-dashed border-slate-600 rounded-2xl p-12 text-center cursor-pointer hover:border-cyan-400 hover:bg-slate-900/30 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Clique para enviar uma mídia
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  ou arraste o arquivo aqui
                </p>
                <p className="text-xs text-slate-500">
                  Vídeos (MP4, WebM, Ogg), GIFs e Imagem (PNG, JPG, WebP)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
