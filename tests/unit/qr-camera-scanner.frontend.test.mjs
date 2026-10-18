import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pruebas unitarias para la lógica del visor de cámara y escáner QR (/empleado/qr - TAREA 3)
 */

describe('HU13 / TAREA 3: Lógica de Cámara, Ciclo de Vida y Detección QR', () => {
  // 1. Clasificación de errores de getUserMedia
  describe('Clasificación de errores de cámara', () => {
    function classifyCameraError(err) {
      if (!err) return 'Error desconocido al inicializar la cámara.';
      const name = err.name || '';
      switch (name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          return 'Permiso de acceso a la cámara denegado. Permite el uso de cámara en tu navegador o ingresa el código manualmente.';
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          return 'No se detectó ninguna cámara disponible en este dispositivo. Conecta una cámara o ingresa el código manual.';
        case 'NotReadableError':
        case 'TrackStartError':
          return 'La cámara ya está siendo utilizada por otra aplicación o pestaña. Ciérrala e intenta de nuevo.';
        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
          return 'No se pudo configurar la resolución de la cámara. Intenta con otra cámara.';
        case 'SecurityError':
          return 'Error de seguridad: La cámara requiere un contexto seguro (HTTPS o localhost).';
        default:
          return err.message || 'No se pudo inicializar la cámara. Verifica los permisos del dispositivo.';
      }
    }

    test('NotAllowedError devuelve mensaje instructivo sobre permisos del navegador', () => {
      const err = new Error('Permission denied');
      err.name = 'NotAllowedError';
      const msg = classifyCameraError(err);
      assert.match(msg, /Permiso de acceso a la cámara denegado/i);
    });

    test('NotFoundError devuelve mensaje de dispositivo no encontrado', () => {
      const err = new Error('Requested device not found');
      err.name = 'NotFoundError';
      const msg = classifyCameraError(err);
      assert.match(msg, /No se detectó ninguna cámara disponible/i);
    });

    test('NotReadableError devuelve mensaje de cámara ocupada por otra app o pestaña', () => {
      const err = new Error('Could not start video source');
      err.name = 'NotReadableError';
      const msg = classifyCameraError(err);
      assert.match(msg, /La cámara ya está siendo utilizada por otra aplicación/i);
    });

    test('OverconstrainedError devuelve mensaje de restricciones no compatibles', () => {
      const err = new Error('Constraints could not be satisfied');
      err.name = 'OverconstrainedError';
      const msg = classifyCameraError(err);
      assert.match(msg, /No se pudo configurar la resolución de la cámara/i);
    });

    test('SecurityError devuelve mensaje indicando requisito de HTTPS / localhost', () => {
      const err = new Error('Only secure contexts are allowed to use camera');
      err.name = 'SecurityError';
      const msg = classifyCameraError(err);
      assert.match(msg, /contexto seguro \(HTTPS o localhost\)/i);
    });
  });

  // 2. Manejo de fallback de restricciones
  describe('Fallback de restricciones de cámara', () => {
    test('Si facingMode environment falla por OverconstrainedError, se reintenta con video: true genérico', async () => {
      let attempts = [];

      async function mockGetUserMedia(constraints) {
        attempts.push(constraints);
        if (constraints.video?.facingMode) {
          const err = new Error('Environment camera not found');
          err.name = 'OverconstrainedError';
          throw err;
        }
        return {
          id: 'generic-camera-stream',
          getTracks: () => [{ stop: () => {} }],
        };
      }

      async function getCameraStream() {
        try {
          return await mockGetUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
        } catch (err) {
          if (err.name === 'OverconstrainedError') {
            return await mockGetUserMedia({ video: true, audio: false });
          }
          throw err;
        }
      }

      const stream = await getCameraStream();
      assert.equal(attempts.length, 2);
      assert.deepEqual(attempts[0], { video: { facingMode: { ideal: 'environment' } }, audio: false });
      assert.deepEqual(attempts[1], { video: true, audio: false });
      assert.equal(stream.id, 'generic-camera-stream');
    });

    test('Si falla por NotAllowedError, no se reintenta con constraints genéricas innecesariamente', async () => {
      let attempts = [];

      async function mockGetUserMedia(constraints) {
        attempts.push(constraints);
        const err = new Error('Permission denied');
        err.name = 'NotAllowedError';
        throw err;
      }

      async function getCameraStream() {
        try {
          return await mockGetUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
        } catch (err) {
          if (err.name === 'OverconstrainedError') {
            return await mockGetUserMedia({ video: true, audio: false });
          }
          throw err;
        }
      }

      await assert.rejects(
        async () => { await getCameraStream(); },
        { name: 'NotAllowedError' }
      );
      assert.equal(attempts.length, 1);
    });
  });

  // 3. Limpieza de stream y prevención de fugas de recursos (React Strict Mode / Desmontaje)
  describe('Limpieza de pistas (Tracks) y prevención de leaks', () => {
    test('stopCamera detiene todas las pistas activas del MediaStream y libera referencias', () => {
      let track1Stopped = false;
      let track2Stopped = false;

      const mockStream = {
        getTracks: () => [
          { stop: () => { track1Stopped = true; } },
          { stop: () => { track2Stopped = true; } },
        ],
      };

      const mockVideo = {
        srcObject: mockStream,
      };

      let intervalCleared = false;
      const intervalId = 12345;

      function stopCamera(state) {
        if (state.intervalId) {
          intervalCleared = true;
          state.intervalId = null;
        }
        if (state.stream) {
          state.stream.getTracks().forEach((track) => track.stop());
          state.stream = null;
        }
        if (state.video) {
          state.video.srcObject = null;
        }
        state.cameraActive = false;
        state.isProcessingScan = false;
      }

      const state = {
        stream: mockStream,
        video: mockVideo,
        intervalId,
        cameraActive: true,
        isProcessingScan: false,
      };

      stopCamera(state);

      assert.equal(track1Stopped, true, 'Track 1 debió ser detenido');
      assert.equal(track2Stopped, true, 'Track 2 debió ser detenido');
      assert.equal(intervalCleared, true, 'El intervalo debió ser limpiado');
      assert.equal(state.stream, null, 'stream debe ser null');
      assert.equal(mockVideo.srcObject, null, 'video.srcObject debe quedar null');
      assert.equal(state.cameraActive, false);
    });

    test('Si el componente se desmonta mientras getUserMedia está pendiente, el stream resultante se destruye de inmediato', async () => {
      let isMounted = true;
      let trackStoppedOnAbort = false;

      const deferredGetUserMedia = async () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              getTracks: () => [{ stop: () => { trackStoppedOnAbort = true; } }],
            });
          }, 10);
        });
      };

      async function startCameraLifecycle() {
        const stream = await deferredGetUserMedia();
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return null;
        }
        return stream;
      }

      // Simulamos que el usuario navegó a otra ruta antes de que la cámara responda
      const promise = startCameraLifecycle();
      isMounted = false; // Desmontaje durante await
      const res = await promise;

      assert.equal(res, null);
      assert.equal(trackStoppedOnAbort, true, 'El track debió detenerse para no dejar la luz de la cámara encendida');
    });
  });

  // 4. BarcodeDetector y prevención de escaneos concurrentes / duplicados
  describe('Detección QR y debounce de procesamiento', () => {
    test('Detección QR válida procesa el código y evita lecturas concurrentes simultáneas', async () => {
      let consultCalledWith = [];
      let isProcessingScan = false;

      function handleConsult(code) {
        consultCalledWith.push(code);
      }

      function processBarcodeFrame(detectedCode) {
        if (isProcessingScan) return;
        if (detectedCode && detectedCode.trim()) {
          isProcessingScan = true;
          handleConsult(detectedCode.trim());
        }
      }

      // Frame 1 detecta código
      processBarcodeFrame('VC-ABC-1234');
      // Frame 2 subsiguiente inmediato antes de desmontar
      processBarcodeFrame('VC-ABC-1234');
      // Frame 3 con otro código
      processBarcodeFrame('VC-XYZ-9999');

      assert.equal(consultCalledWith.length, 1);
      assert.equal(consultCalledWith[0], 'VC-ABC-1234');
      assert.equal(isProcessingScan, true);
    });
  });

  // 5. Asignación de color de pulseras según servicio
  describe('Asignación de color de pulseras según servicio', () => {
    function getWristbandInfo(serviceName, categoryName) {
      const text = `${serviceName} ${categoryName || ''}`.toLowerCase();
      if (text.includes('piscina') || text.includes('pool') || text.includes('acuátic')) {
        return { color: 'BLUE', label: 'Azul (Piscinas)' };
      }
      if (text.includes('humed') || text.includes('sauna') || text.includes('turco') || text.includes('wet')) {
        return { color: 'PURPLE', label: 'Morado (Zona Húmeda)' };
      }
      if (text.includes('gym') || text.includes('gimnasio') || text.includes('pesas')) {
        return { color: 'RED', label: 'Rojo (Gimnasio)' };
      }
      return { color: 'GREEN', label: 'Verde (Canchas deportivas)' };
    }

    test('Piscina Olímpica asigna pulsera Azul', () => {
      const res = getWristbandInfo('Piscina Olímpica', 'Acuáticos');
      assert.equal(res.color, 'BLUE');
    });

    test('Zona Húmeda / Sauna asigna pulsera Morada', () => {
      const res = getWristbandInfo('Sauna y Turco', 'Bienestar');
      assert.equal(res.color, 'PURPLE');
    });

    test('Gimnasio VIP asigna pulsera Roja', () => {
      const res = getWristbandInfo('Pase Diario Gimnasio', 'Fitness');
      assert.equal(res.color, 'RED');
    });

    test('Cancha Sintética asigna pulsera Verde', () => {
      const res = getWristbandInfo('Cancha Fútbol 5', 'Deportes');
      assert.equal(res.color, 'GREEN');
    });
  });

  // 6. Extracción robusta de código de ticket (URLs o códigos raw)
  describe('Extracción de código de ticket (extractTicketCode)', () => {
    function extractTicketCode(raw) {
      const trimmed = raw.trim();
      try {
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          const url = new URL(trimmed);
          const codeParam = url.searchParams.get('code') || url.searchParams.get('ticketCode');
          if (codeParam) return codeParam.trim();
          const parts = url.pathname.split('/').filter(Boolean);
          if (parts.length > 0) {
            return parts[parts.length - 1].trim();
          }
        }
      } catch {
        // No es una URL válida
      }
      return trimmed;
    }

    test('Extrae código plano sin alterar', () => {
      assert.equal(extractTicketCode('247ae24514589d30d12e697fc5d003b6'), '247ae24514589d30d12e697fc5d003b6');
    });

    test('Limpia espacios en blanco al inicio y al final', () => {
      assert.equal(extractTicketCode('   A1B2C3D4E5   '), 'A1B2C3D4E5');
    });

    test('Extrae parámetro ?code= desde una URL completa', () => {
      assert.equal(
        extractTicketCode('http://localhost:3000/empleado/qr?code=247ae24514589d30d12e697fc5d003b6'),
        '247ae24514589d30d12e697fc5d003b6'
      );
    });

    test('Extrae parámetro ?ticketCode= desde una URL', () => {
      assert.equal(
        extractTicketCode('https://vicecity.app/portal?ticketCode=998877aabbcc'),
        '998877aabbcc'
      );
    });

    test('Extrae el último segmento de ruta si la URL no tiene query param', () => {
      assert.equal(
        extractTicketCode('https://vicecity.app/api/qr/abcdef123456/'),
        'abcdef123456'
      );
    });
  });

  // 7. Dual Engine Scanner (BarcodeDetector nativo + jsQR fallback)
  describe('Motor de escaneo dual (BarcodeDetector + jsQR)', () => {
    test('Si BarcodeDetector nativo falla o no está soportado, se decodifica exitosamente mediante jsQR', async () => {
      let jsQRCalled = false;
      const mockJsQR = (data, w, h) => {
        jsQRCalled = true;
        return { data: 'MOCK-JSQR-TICKET-CODE' };
      };

      async function scanFrame({ nativeDetectorAvailable, nativeDetectorFails }) {
        let detected = null;

        if (nativeDetectorAvailable) {
          if (nativeDetectorFails) {
            // Falla simulada del detector nativo
          } else {
            detected = 'NATIVE-CODE';
          }
        }

        if (!detected) {
          const qr = mockJsQR(new Uint8ClampedArray(100), 10, 10);
          if (qr?.data) detected = qr.data;
        }

        return detected;
      }

      // Caso A: Sin BarcodeDetector (Chrome/Edge en Windows sin flags)
      const resA = await scanFrame({ nativeDetectorAvailable: false });
      assert.equal(resA, 'MOCK-JSQR-TICKET-CODE');
      assert.equal(jsQRCalled, true);

      // Caso B: BarcodeDetector nativo disponible y funcionando
      jsQRCalled = false;
      const resB = await scanFrame({ nativeDetectorAvailable: true, nativeDetectorFails: false });
      assert.equal(resB, 'NATIVE-CODE');
      assert.equal(jsQRCalled, false);
    });
  });
});


