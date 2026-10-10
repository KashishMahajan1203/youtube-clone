import { useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseMediaRecorderProps {
  socket: Socket | null;
  roomId: string;
  stream: MediaStream | null;
}

export const useMediaRecorder = ({ socket, roomId, stream }: UseMediaRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(() => {
    if (!stream) return;

    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: 'video/webm',
      });
      const url = URL.createObjectURL(blob);

      // Download the recorded video
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${roomId}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);

    if (socket) {
      socket.emit('start-recording', roomId);
    }
  }, [stream, socket, roomId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (socket) {
        socket.emit('stop-recording', roomId);
      }
    }
  }, [isRecording, socket, roomId]);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
};
