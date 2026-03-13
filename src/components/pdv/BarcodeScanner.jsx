import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X, Loader2, Keyboard } from "lucide-react";
import { toast } from "sonner";

// Carrega QuaggaJS via CDN
const loadQuagga = () => {
  return new Promise((resolve, reject) => {
    if (window.Quagga) {
      resolve(window.Quagga);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.8.4/dist/quagga.min.js';
    script.onload = () => resolve(window.Quagga);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default function BarcodeScanner({ open, onClose, onDetected }) {
  const [scanning, setScanning] = useState(false);
  const [stream, setStream] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [codigoManual, setCodigoManual] = useState("");
  const [modoManual, setModoManual] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const detectadoRef = useRef(false);

  useEffect(() => {
    if (open) {
      detectadoRef.current = false;
      setModoManual(false);
      setCodigoManual("");
      iniciarQuaggaScanner();
    } else {
      pararQuaggaScanner();
    }
    
    return () => pararQuaggaScanner();
  }, [open]);

  const iniciarQuaggaScanner = async () => {
    try {
      const Quagga = await loadQuagga();
      
      if (!videoRef.current) return;
      
      Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            facingMode: "environment",
            width: { min: 640, ideal: 1920 },
            height: { min: 480, ideal: 1080 }
          },
          area: {
            top: "30%",
            right: "10%",
            left: "10%",
            bottom: "30%"
          }
        },
        decoder: {
          readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader", "upc_e_reader"],
          multiple: false
        },
        locate: true,
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 2,
        frequency: 5
      }, (err) => {
        if (err) {
          console.error("Erro Quagga:", err);
          toast.error("Erro ao iniciar scanner");
          setModoManual(true);
          return;
        }
        
        Quagga.start();
        setScanning(true);
        toast.success("📷 Scanner ativo!");
      });
      
      Quagga.onDetected((result) => {
        if (detectadoRef.current) return;
        
        const codigo = result.codeResult.code;
        
        if (!codigo || codigo.length < 8) return;
        
        detectadoRef.current = true;
        setProcessando(true);
        
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKnn77JlGwc+ku7w0ogxBSN4x/DdkUAKFF607uunVRQKRp/g8r5sIQUxh9Hz04IzBh5uwO/jmVEND1Sp5++yZRsHPpLu8NKIMQ==');
        audio.volume = 0.8;
        audio.play().catch(() => {});
        
        if (navigator.vibrate) navigator.vibrate(200);
        
        toast.success(`✅ ${codigo}`);
        
        setTimeout(() => {
          onDetected(codigo);
          pararQuaggaScanner();
        }, 300);
      });
      
    } catch (error) {
      console.error("Erro ao carregar Quagga:", error);
      toast.error("Erro ao carregar scanner - use modo manual");
      setModoManual(true);
    }
  };



  const pararQuaggaScanner = () => {
    try {
      if (window.Quagga) {
        window.Quagga.stop();
      }
    } catch (e) {
    }
    
    setScanning(false);
    setProcessando(false);
  };

  const confirmarCodigoManual = () => {
    if (!codigoManual.trim()) {
      toast.error("Digite o código de barras!");
      return;
    }
    
    if (codigoManual.length < 8) {
      toast.error("Código muito curto! Mínimo 8 dígitos.");
      return;
    }
    
    toast.success(`✅ Código: ${codigoManual}`);
    onDetected(codigoManual);
    pararQuaggaScanner();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scanner de Código de Barras
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!modoManual ? (
            <>
              <div ref={videoRef} className="relative bg-black rounded-lg overflow-hidden w-full h-80">
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-32 border-4 border-red-500 rounded-lg animate-pulse shadow-lg"></div>
                </div>
                
                {processando && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-4 flex items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="font-semibold">Processando...</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                <p className="font-semibold">📷 Posicione o código de barras na área vermelha</p>
                <p className="text-xs mt-1">💡 Mantenha estável e bem iluminado • Detecção automática</p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  pararQuaggaScanner();
                  setModoManual(true);
                }}
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Digitar Código Manualmente
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Digite o código de barras
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: 7891234567890"
                    value={codigoManual}
                    onChange={(e) => setCodigoManual(e.target.value.replace(/\D/g, ''))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        confirmarCodigoManual();
                      }
                    }}
                    autoFocus
                    className="text-lg text-center font-mono"
                    maxLength={13}
                  />
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">
                  <p>⌨️ Digite os números do código de barras</p>
                  <p className="text-xs mt-1">Pressione Enter para confirmar</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setModoManual(false);
                    setCodigoManual("");
                    iniciarQuaggaScanner();
                  }}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Voltar Scanner
                </Button>
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  onClick={confirmarCodigoManual}
                >
                  Confirmar
                </Button>
              </div>
            </>
          )}
          
          <Button variant="ghost" className="w-full" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}