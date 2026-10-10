import { useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseScreenShareProps {
  socket: Socket | null;
  roomId: string;
}

export const useScreenShare = ({ socket, roomId }: UseScreenShareProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      setScreenStream(stream);
      setIsSharing(true);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      if (socket) {
        socket.emit('start-screen-share', roomId);
      }

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  }, [socket, roomId]);

  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setIsSharing(false);

    if (socket) {
      socket.emit('stop-screen-share', roomId);
    }
  }, [screenStream, socket, roomId]);

  return {
    isSharing,
    screenStream,
    screenVideoRef,
    startScreenShare,
    stopScreenShare,
  };
};
